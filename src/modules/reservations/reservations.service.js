const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require("../../errors/AppError");
const { noopEventBus } = require("../../events/eventBus");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;
const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: []
};

function canAccessReservation(reservation, currentUser) {
  return reservation.user.id === currentUser.id || currentUser.role === "ADMIN";
}

function roomIdOf(reservation, fallback) {
  return reservation.room?.id ?? reservation.roomId ?? fallback;
}

function userIdOf(reservation, fallback) {
  return reservation.user?.id ?? reservation.userId ?? fallback;
}

function createReservationsService({ runInTransaction, eventBus = noopEventBus, now = () => new Date() }) {
  return {
    async listReservations(query, currentUser) {
      if (currentUser.role !== "ADMIN" && query.userId !== undefined) {
        throw new ForbiddenError("Only ADMIN can filter reservations by userId");
      }
      const filters = { ...query };
      if (currentUser.role !== "ADMIN") filters.userId = currentUser.id;

      return runInTransaction(async ({ reservations }) => {
        const { items, total } = await reservations.list(filters);
        return {
          items,
          meta: {
            page: query.page,
            limit: query.limit,
            total,
            totalPages: Math.ceil(total / query.limit)
          }
        };
      });
    },

    async getReservation(id, currentUser) {
      return runInTransaction(async ({ reservations }) => {
        const reservation = await reservations.findById(id);
        if (!reservation || !canAccessReservation(reservation, currentUser)) {
          throw new NotFoundError("Reservation");
        }
        return reservation;
      });
    },

    async createReservation(input, currentUser) {
      const created = await runInTransaction(async ({ rooms, reservations }) => {
        await rooms.lockById(input.roomId);
        const room = await rooms.findById(input.roomId);
        if (!room) throw new NotFoundError("Room");

        const start = new Date(input.startTime).getTime();
        const end = new Date(input.endTime).getTime();

        if (end <= start) {
          throw new ValidationError([
            { location: "body", field: "endTime", message: "endTime must be later than startTime" }
          ]);
        }
        if (end - start < MIN_DURATION_MS || end - start > MAX_DURATION_MS) {
          throw new ValidationError([
            { location: "body", field: "endTime", message: "Reservation must last between 15 minutes and 8 hours" }
          ]);
        }
        if (start <= now().getTime()) {
          throw new ValidationError([
            { location: "body", field: "startTime", message: "startTime must be in the future" }
          ]);
        }
        if (input.participants > room.capacity) {
          throw new ConflictError("Room capacity exceeded", "ROOM_CAPACITY_EXCEEDED");
        }

        const confirmed = await reservations.findConfirmedByRoomId(room.id);
        const overlaps = confirmed.some((reservation) => {
          const existingStart = new Date(reservation.startTime).getTime();
          const existingEnd = new Date(reservation.endTime).getTime();
          return start < existingEnd && existingStart < end;
        });
        if (overlaps) {
          throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
        }

        return reservations.create({
          roomId: room.id,
          userId: currentUser.id,
          participants: input.participants,
          startTime: new Date(start).toISOString(),
          endTime: new Date(end).toISOString(),
          status: "CONFIRMED",
          createdAt: now().toISOString(),
          cancelledAt: null
        });
      });

      eventBus.publish("reservation.created", {
        reservationId: created.id,
        roomId: roomIdOf(created, input.roomId),
        userId: currentUser.id,
        startTime: new Date(created.startTime).toISOString(),
        endTime: new Date(created.endTime).toISOString()
      });
      return created;
    },

    async cancelReservation(id, currentUser) {
      const outcome = await runInTransaction(async ({ reservations }) => {
        const reservation = await reservations.findById(id);
        if (!reservation || !canAccessReservation(reservation, currentUser)) {
          throw new NotFoundError("Reservation");
        }
        if (reservation.status === "CANCELLED") {
          return { reservation, changed: false };
        }

        if (new Date(reservation.startTime).getTime() <= now().getTime()) {
          throw new ConflictError("Reservation has already started", "RESERVATION_ALREADY_STARTED");
        }

        const allowed = ALLOWED_TRANSITIONS[reservation.status] ?? [];
        if (!allowed.includes("CANCELLED")) {
          throw new ConflictError(
            `Cannot change status from ${reservation.status} to CANCELLED`,
            "INVALID_STATUS_TRANSITION"
          );
        }

        const updated = await reservations.markCancelled(id, now().toISOString());
        return { reservation: updated, changed: true };
      });

      if (outcome.changed) {
        eventBus.publish("reservation.cancelled", {
          reservationId: outcome.reservation.id,
          roomId: roomIdOf(outcome.reservation),
          userId: userIdOf(outcome.reservation),
          cancelledBy: currentUser.id
        });
      }
      return outcome.reservation;
    }
  };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
