const knex = require("knex");
const config = require("../knexfile");

const roomId = 3;
const startTime = "2026-12-15T10:00:00.000Z";
const endTime = "2026-12-15T12:00:00.000Z";

async function login() {
  const response = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "jan.kowalski@example.com",
      password: "user-password-123"
    })
  });
  if (!response.ok) throw new Error(`Login failed: ${response.status}`);
  const body = await response.json();
  return body.accessToken;
}

async function book(index, token) {
  const response = await fetch("http://localhost:3000/api/reservations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      roomId,
      participants: 2,
      startTime,
      endTime
    })
  });
  console.log(`request ${index}: ${response.status}`);
  return response.status;
}

async function main() {
  const token = await login();
  await Promise.all(Array.from({ length: 10 }, (_, index) => book(index + 1, token)));

  const db = knex(config);
  try {
    const row = await db("reservations")
      .where({ room_id: roomId, status: "CONFIRMED" })
      .where("start_time", "<", endTime)
      .where("end_time", ">", startTime)
      .count({ count: "*" })
      .first();
    console.log(`CONFIRMED in database: ${Number(row.count)}`);
  } finally {
    await db.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
