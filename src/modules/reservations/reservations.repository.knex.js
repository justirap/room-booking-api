const SORT_COLUMNS = {
  startTime: "reservations.start_time",
  createdAt: "reservations.created_at",
  participants: "reservations.participants"
};

function toReservation(row) {
  if (!row) return null;
  return {
    id: row.id,
    participants: row.participants,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.status,
    createdAt: row.created_at,
    cancelledAt: row.cancelled_at,
    user: {
      id: row.user_id,
      email: row.user_email
    },
    room: {
      id: row.room_id,
      name: row.room_name,
      building: {
        id: row.building_id,
        name: row.building_name
      }
    }
  };
}

function reservationBase(db) {
  return db("reservations")
    .join("rooms", "rooms.id", "reservations.room_id")
    .join("buildings", "buildings.id", "rooms.building_id")
    .join("users", "users.id", "reservations.user_id");
}

function applyFilters(query, filters) {
  if (filters.roomId) query.where("reservations.room_id", filters.roomId);
  if (filters.buildingId) query.where("rooms.building_id", filters.buildingId);
  if (filters.userId) query.where("reservations.user_id", filters.userId);
  if (filters.status) query.where("reservations.status", filters.status);
  if (filters.from) query.where("reservations.end_time", ">", filters.from);
  if (filters.to) query.where("reservations.start_time", "<", filters.to);
}

const reservationColumns = [
  "reservations.id",
  "reservations.user_id",
  "reservations.participants",
  "reservations.start_time",
  "reservations.end_time",
  "reservations.status",
  "reservations.created_at",
  "reservations.cancelled_at",
  "users.email as user_email",
  "rooms.id as room_id",
  "rooms.name as room_name",
  "buildings.id as building_id",
  "buildings.name as building_name"
];

function createReservationsRepository(db) {
  return {
    async findById(id) {
      const row = await reservationBase(db)
        .where("reservations.id", id)
        .select(reservationColumns)
        .first();
      return toReservation(row);
    },

    async findConfirmedByRoomId(roomId) {
      const rows = await db("reservations")
        .where({ room_id: roomId, status: "CONFIRMED" })
        .select("id", "room_id", "start_time", "end_time", "status");
      return rows.map((row) => ({
        id: row.id,
        roomId: row.room_id,
        startTime: row.start_time,
        endTime: row.end_time,
        status: row.status
      }));
    },

    async list(filters = {}) {
      const sort = filters.sort || "startTime";
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const descending = sort.startsWith("-");
      const column = SORT_COLUMNS[descending ? sort.slice(1) : sort];
      const base = reservationBase(db).modify((query) => applyFilters(query, filters));

      const [rows, countRow] = await Promise.all([
        base.clone()
          .select(reservationColumns)
          .orderBy(column, descending ? "desc" : "asc")
          .orderBy("reservations.id", "asc")
          .limit(limit)
          .offset((page - 1) * limit),
        base.clone().count({ count: "*" }).first()
      ]);

      return {
        items: rows.map(toReservation),
        total: Number(countRow.count)
      };
    },

    async create(data) {
      const [row] = await db("reservations")
        .insert({
          room_id: data.roomId,
          user_id: data.userId,
          participants: data.participants,
          start_time: data.startTime,
          end_time: data.endTime,
          status: data.status,
          cancelled_at: data.cancelledAt,
          created_at: data.createdAt
        })
        .returning("id");
      const id = typeof row === "object" ? row.id : row;
      return this.findById(id);
    },

    async markCancelled(id, cancelledAt) {
      await db("reservations").where({ id }).update({
        status: "CANCELLED",
        cancelled_at: cancelledAt
      });
      return this.findById(id);
    }
  };
}

module.exports = { createReservationsRepository };
