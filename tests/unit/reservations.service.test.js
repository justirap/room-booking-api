const { createReservationsService } = require("../../src/modules/reservations/reservations.service");
const { createReservationsRepository } = require("../../src/modules/reservations/reservations.repository.memory");
const { createRoomsRepository } = require("../../src/modules/rooms/rooms.repository.memory");

const owner = { id: 1, role: "USER" };
const otherUser = { id: 2, role: "USER" };
const admin = { id: 99, role: "ADMIN" };
const NOW = new Date("2026-11-01T08:00:00.000Z");

function iso(hours, minutes = 0, day = 2) {
  return new Date(Date.UTC(2026, 10, day, hours, minutes, 0)).toISOString();
}

function createInMemoryUnitOfWork({ rooms, reservations }) {
  const repositories = {
    rooms: createRoomsRepository(rooms),
    reservations: createReservationsRepository(reservations)
  };
  return {
    runInTransaction: async (fn) => fn(repositories)
  };
}

function setup({ reservations = [] } = {}) {
  const { runInTransaction } = createInMemoryUnitOfWork({
    rooms: [
      { id: 1, name: "101", capacity: 10, buildingId: 1 },
      { id: 2, name: "102", capacity: 10, buildingId: 1 }
    ],
    reservations
  });
  const eventBus = { publish: jest.fn(), subscribe: jest.fn() };
  const service = createReservationsService({
    runInTransaction,
    eventBus,
    now: () => NOW
  });
  return { service, eventBus };
}

function existing({
  id = 1,
  roomId = 1,
  userId = owner.id,
  start = iso(10),
  end = iso(12),
  status = "CONFIRMED",
  cancelledAt = null
} = {}) {
  return {
    id,
    roomId,
    userId,
    user: { id: userId, email: "owner@example.com" },
    room: { id: roomId, name: "101" },
    participants: 2,
    startTime: start,
    endTime: end,
    status,
    createdAt: NOW.toISOString(),
    cancelledAt
  };
}

function input(overrides = {}) {
  return {
    roomId: 1,
    participants: 2,
    startTime: iso(10),
    endTime: iso(11),
    ...overrides
  };
}

describe("reservationsService.createReservation overlap", () => {
  test("rejects a partial overlap", async () => {
    const { service } = setup({
      reservations: [existing({ start: iso(10), end: iso(12) })]
    });
    await expect(service.createReservation(input({ startTime: iso(11), endTime: iso(13) }), owner))
      .rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
  });

  test("rejects a reservation contained in an existing one", async () => {
    const { service } = setup({
      reservations: [existing({ start: iso(10), end: iso(14) })]
    });
    await expect(service.createReservation(input({ startTime: iso(11), endTime: iso(12) }), owner))
      .rejects.toMatchObject({ code: "ROOM_ALREADY_BOOKED" });
  });

  test("allows a reservation that starts exactly when another ends", async () => {
    const { service } = setup({
      reservations: [existing({ start: iso(10), end: iso(11) })]
    });
    await expect(service.createReservation(input({ startTime: iso(11), endTime: iso(12) }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("allows a reservation that ends exactly when another starts", async () => {
    const { service } = setup({
      reservations: [existing({ start: iso(12), end: iso(13) })]
    });
    await expect(service.createReservation(input({ startTime: iso(11), endTime: iso(12) }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });

  test("allows the same time range in a different room", async () => {
    const { service } = setup({
      reservations: [existing({ roomId: 1, start: iso(10), end: iso(12) })]
    });
    await expect(service.createReservation(input({ roomId: 2, startTime: iso(10), endTime: iso(12) }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED", roomId: 2 });
  });

  test("ignores a CANCELLED reservation in the same time range", async () => {
    const { service } = setup({
      reservations: [existing({ status: "CANCELLED", cancelledAt: "2026-10-01T00:00:00.000Z" })]
    });
    await expect(service.createReservation(input({ startTime: iso(10), endTime: iso(12) }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED" });
  });
});

describe("reservationsService.createReservation capacity", () => {
  test("allows participants equal to room capacity", async () => {
    const { service } = setup();
    await expect(service.createReservation(input({ participants: 10 }), owner))
      .resolves.toMatchObject({ status: "CONFIRMED", participants: 10 });
  });

  test("rejects participants above room capacity", async () => {
    const { service } = setup();
    await expect(service.createReservation(input({ participants: 11 }), owner))
      .rejects.toMatchObject({ code: "ROOM_CAPACITY_EXCEEDED" });
  });
});

describe("reservationsService.createReservation duration", () => {
  test.each([
    ["exactly 15 minutes", 15 * 60 * 1000, true],
    ["exactly 8 hours", 8 * 60 * 60 * 1000, true],
    ["14 minutes", 14 * 60 * 1000, false],
    ["8 hours and 1 minute", 8 * 60 * 60 * 1000 + 60 * 1000, false]
  ])("duration: %s", async (_label, durationMs, allowed) => {
    const { service } = setup();
    const start = new Date("2026-11-02T10:00:00.000Z");
    const end = new Date(start.getTime() + durationMs);
    const reservation = input({
      startTime: start.toISOString(),
      endTime: end.toISOString()
    });

    if (allowed) {
      await expect(service.createReservation(reservation, owner))
        .resolves.toMatchObject({ status: "CONFIRMED" });
    } else {
      await expect(service.createReservation(reservation, owner))
        .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });
});

describe("reservationsService.cancelReservation", () => {
  test("rejects cancelling a reservation that has already started", async () => {
    const { service } = setup({
      reservations: [existing({
        start: "2026-11-01T07:00:00.000Z",
        end: "2026-11-01T09:00:00.000Z"
      })]
    });
    await expect(service.cancelReservation(1, owner))
      .rejects.toMatchObject({ code: "RESERVATION_ALREADY_STARTED" });
  });

  test("second cancel is idempotent and keeps cancelledAt", async () => {
    const { service } = setup({ reservations: [existing()] });
    const first = await service.cancelReservation(1, owner);
    const second = await service.cancelReservation(1, owner);
    expect(second.status).toBe("CANCELLED");
    expect(second.cancelledAt).toBe(first.cancelledAt);
  });

  test("rejects cancel by another USER", async () => {
    const { service } = setup({ reservations: [existing()] });
    await expect(service.cancelReservation(1, otherUser))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  test("allows ADMIN to cancel someone else's reservation", async () => {
    const { service } = setup({ reservations: [existing()] });
    await expect(service.cancelReservation(1, admin))
      .resolves.toMatchObject({ status: "CANCELLED" });
  });
});
