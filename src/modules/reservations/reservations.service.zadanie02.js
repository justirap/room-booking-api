const { NotFoundError, ConflictError, ValidationError } = require("../../errors/AppError");

const MIN_DURATION_MS = 15 * 60 * 1000;
const MAX_DURATION_MS = 8 * 60 * 60 * 1000;
const ALLOWED_TRANSITIONS = {
  CONFIRMED: ["CANCELLED"],
  CANCELLED: []
};

function createReservationsService({ roomsRepository, reservationsRepository, now = () => new Date() }) {
  return {
    async listReservations(filters) {
      return reservationsRepository.list(filters);
    },

    async createReservation(input) {
      const room = await roomsRepository.findById(input.roomId);
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

      const confirmed = await reservationsRepository.findConfirmedByRoomId(room.id);
      const overlaps = confirmed.some((reservation) => {
        const existingStart = new Date(reservation.startTime).getTime();
        const existingEnd = new Date(reservation.endTime).getTime();
        return start < existingEnd && existingStart < end;
      });
      if (overlaps) {
        throw new ConflictError("Room is already booked in this time range", "ROOM_ALREADY_BOOKED");
      }

      return reservationsRepository.create({
        roomId: room.id,
        reservedBy: input.reservedBy,
        participants: input.participants,
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
        status: "CONFIRMED",
        createdAt: now().toISOString(),
        cancelledAt: null,
        internalNote: "created via API v2"
      });
    },

    async cancelReservation(id) {
      const reservation = await reservationsRepository.findById(id);
      if (!reservation) throw new NotFoundError("Reservation");
      if (reservation.status === "CANCELLED") return reservation;

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

      return reservationsRepository.markCancelled(id, now().toISOString());
    }
  };
}

module.exports = { createReservationsService, ALLOWED_TRANSITIONS };
