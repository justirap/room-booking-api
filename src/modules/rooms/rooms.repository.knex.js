function toRoom(row) {
  if (!row) return null;
  const room = {
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    buildingId: row.building_id
  };
  if (row.building_name !== undefined) {
    room.building = { id: row.building_id, name: row.building_name };
  }
  return room;
}

function createRoomsRepository(db) {
  return {
    async findAll() {
      const rows = await db("rooms").select("id", "name", "capacity", "building_id").orderBy("id", "asc");
      return rows.map(toRoom);
    },

    async findById(id) {
      const row = await db("rooms")
        .join("buildings", "buildings.id", "rooms.building_id")
        .where("rooms.id", id)
        .select(
          "rooms.id",
          "rooms.name",
          "rooms.capacity",
          "rooms.building_id",
          "buildings.name as building_name"
        )
        .first();
      return toRoom(row);
    },

    async findByBuildingId(buildingId) {
      const rows = await db("rooms")
        .where({ building_id: buildingId })
        .select("id", "name", "capacity", "building_id")
        .orderBy("id", "asc");
      return rows.map(toRoom);
    },

    async lockById(id) {
      return db("rooms").where({ id }).forUpdate().first();
    },

    async create({ buildingId, name, capacity }) {
      const [row] = await db("rooms")
        .insert({ building_id: buildingId, name, capacity })
        .returning(["id", "name", "capacity", "building_id"]);
      return toRoom(row);
    }
  };
}

module.exports = { createRoomsRepository };
