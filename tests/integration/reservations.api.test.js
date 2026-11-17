const request = require("supertest");
const config = require("../../src/config");
const db = require("../../src/db/knex");
const { createApp } = require("../../src/app");
const { createKnexUnitOfWork } = require("../../src/db/unitOfWork");
const { createUsersRepository } = require("../../src/modules/auth/users.repository.knex");

const app = createApp({
  config,
  runInTransaction: createKnexUnitOfWork(db).runInTransaction,
  usersRepository: createUsersRepository(db)
});

const PASSWORD = "password-123";

function futureRange(offsetHours, durationHours = 1) {
  const start = new Date(Date.now() + offsetHours * 60 * 60 * 1000);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString()
  };
}

async function register(email) {
  const res = await request(app).post("/api/auth/register").send({ email, password: PASSWORD });
  expect(res.status).toBe(201);
  return res.body;
}

async function login(email) {
  const res = await request(app).post("/api/auth/login").send({ email, password: PASSWORD });
  expect(res.status).toBe(200);
  return res.body.accessToken;
}

async function registerAndLogin(email) {
  await register(email);
  return login(email);
}

async function registerAdminAndLogin(email) {
  await register(email);
  await db("users").where({ email }).update({ role: "ADMIN" });
  return login(email);
}

async function createBuildingAndRoom(adminToken, { name = "101", capacity = 10 } = {}) {
  const building = await request(app)
    .post("/api/buildings")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ name: "Budynek testowy", address: "ul. Testowa 1" })
    .expect(201);
  const room = await request(app)
    .post("/api/rooms")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ buildingId: building.body.id, name, capacity })
    .expect(201);
  return room.body;
}

beforeAll(async () => {
  await db.migrate.latest();
});

beforeEach(async () => {
  await db.raw("TRUNCATE reservations, rooms, buildings, users RESTART IDENTITY CASCADE");
});

afterAll(async () => {
  await db.destroy();
});

describe("Auth and reservations API", () => {
  test("register, login and GET /api/auth/me", async () => {
    await register("jan@example.com");
    const token = await login("jan@example.com");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email: "jan@example.com", role: "USER" });
  });

  test("POST /api/reservations returns 201, Location and persists the row", async () => {
    const adminToken = await registerAdminAndLogin("admin@example.com");
    const token = await registerAndLogin("jan@example.com");
    const room = await createBuildingAndRoom(adminToken);
    const body = { roomId: room.id, participants: 2, ...futureRange(24) };

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/reservations/${res.body.id}`);
    const row = await db("reservations").where({ id: res.body.id }).first();
    expect(row).toMatchObject({
      room_id: room.id,
      participants: 2,
      status: "CONFIRMED"
    });
  });

  test("400 with field details for an invalid body", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: 1,
        participants: 1,
        endTime: "2027-01-02T11:00:00.000Z"
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ location: "body", field: "startTime" })
    ]));
  });

  test("401 without a token", async () => {
    const res = await request(app).get("/api/reservations");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("403 when USER creates a room", async () => {
    const token = await registerAndLogin("jan@example.com");
    const res = await request(app)
      .post("/api/rooms")
      .set("Authorization", `Bearer ${token}`)
      .send({ buildingId: 1, name: "101", capacity: 10 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  test("404 when USER reads someone else's reservation", async () => {
    const adminToken = await registerAdminAndLogin("admin@example.com");
    const janToken = await registerAndLogin("jan@example.com");
    const annaToken = await registerAndLogin("anna@example.com");
    const room = await createBuildingAndRoom(adminToken);
    const created = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${janToken}`)
      .send({ roomId: room.id, participants: 2, ...futureRange(24) })
      .expect(201);

    const res = await request(app)
      .get(`/api/reservations/${created.body.id}`)
      .set("Authorization", `Bearer ${annaToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("409 ROOM_ALREADY_BOOKED for an overlapping reservation", async () => {
    const adminToken = await registerAdminAndLogin("admin@example.com");
    const token = await registerAndLogin("jan@example.com");
    const room = await createBuildingAndRoom(adminToken);
    const range = futureRange(48, 2);
    await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ roomId: room.id, participants: 2, ...range })
      .expect(201);

    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({
        roomId: room.id,
        participants: 2,
        startTime: new Date(new Date(range.startTime).getTime() + 60 * 60 * 1000).toISOString(),
        endTime: new Date(new Date(range.endTime).getTime() + 60 * 60 * 1000).toISOString()
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ROOM_ALREADY_BOOKED");
  });

  test("pagination returns meta.total and a shorter data page", async () => {
    const adminToken = await registerAdminAndLogin("admin@example.com");
    const token = await registerAndLogin("jan@example.com");
    const room = await createBuildingAndRoom(adminToken);

    for (const offset of [24, 48, 72]) {
      await request(app)
        .post("/api/reservations")
        .set("Authorization", `Bearer ${token}`)
        .send({ roomId: room.id, participants: 2, ...futureRange(offset) })
        .expect(201);
    }

    const res = await request(app)
      .get("/api/reservations")
      .query({ limit: 2 })
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta.total).toBe(3);
  });
});
