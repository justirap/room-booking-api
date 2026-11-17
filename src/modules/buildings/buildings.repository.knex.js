function toBuilding(row, roomsCount) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdAt: row.created_at,
    ...(roomsCount === undefined ? {} : { roomsCount })
  };
}

function createBuildingsRepository(db) {
  return {
    async findAll() {
      const rows = await db("buildings")
        .leftJoin("rooms", "rooms.building_id", "buildings.id")
        .groupBy("buildings.id", "buildings.name", "buildings.address")
        .select("buildings.id", "buildings.name", "buildings.address")
        .count({ roomsCount: "rooms.id" })
        .orderBy("buildings.id", "asc");

      return rows.map((row) => toBuilding(row, Number(row.roomsCount ?? row.roomscount)));
    },

    async findById(id) {
      const row = await db("buildings").where({ id }).first();
      return toBuilding(row);
    },

    async create({ name, address }) {
      const [row] = await db("buildings").insert({ name, address }).returning("*");
      return toBuilding(row);
    }
  };
}

module.exports = { createBuildingsRepository };
