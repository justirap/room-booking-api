exports.seed = async function seed(knex) {
  await knex("buildings").insert([
    { name: "Budynek A", address: "ul. Warszawska 24, Kraków" },
    { name: "Budynek B", address: "ul. Karmelicka 12, Kraków" },
    { name: "Budynek C", address: "ul. Długa 5, Kraków" }
  ]);

  await knex("rooms").insert([
    { building_id: 1, name: "101", capacity: 30 },
    { building_id: 1, name: "102", capacity: 12 },
    { building_id: 1, name: "103", capacity: 20 },
    { building_id: 2, name: "101", capacity: 50 },
    { building_id: 2, name: "102", capacity: 8 }
  ]);

  await knex("reservations").insert([
    {
      room_id: 1,
      user_id: 2,
      participants: 4,
      start_time: "2026-10-01T10:00:00.000Z",
      end_time: "2026-10-01T11:00:00.000Z",
      status: "CONFIRMED",
      cancelled_at: null,
      created_at: "2026-09-20T08:00:00.000Z"
    },
    {
      room_id: 1,
      user_id: 3,
      participants: 20,
      start_time: "2026-11-10T10:00:00.000Z",
      end_time: "2026-11-10T12:00:00.000Z",
      status: "CONFIRMED",
      cancelled_at: null,
      created_at: "2026-10-20T08:00:00.000Z"
    },
    {
      room_id: 1,
      user_id: 4,
      participants: 10,
      start_time: "2026-11-10T12:00:00.000Z",
      end_time: "2026-11-10T13:00:00.000Z",
      status: "CANCELLED",
      cancelled_at: "2026-10-21T09:00:00.000Z",
      created_at: "2026-10-20T09:00:00.000Z"
    },
    {
      room_id: 4,
      user_id: 3,
      participants: 10,
      start_time: "2026-11-10T10:00:00.000Z",
      end_time: "2026-11-10T12:00:00.000Z",
      status: "CONFIRMED",
      cancelled_at: null,
      created_at: "2026-10-20T10:00:00.000Z"
    },
    {
      room_id: 2,
      user_id: 5,
      participants: 6,
      start_time: "2026-11-11T09:00:00.000Z",
      end_time: "2026-11-11T11:00:00.000Z",
      status: "CONFIRMED",
      cancelled_at: null,
      created_at: "2026-10-21T11:00:00.000Z"
    }
  ]);
};
