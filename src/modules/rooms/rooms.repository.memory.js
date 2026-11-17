function createRoomsRepository(seed = []) {
  const rooms = structuredClone(seed);
  return {
    async findAll() {
      return rooms;
    },
    async findById(id) {
      return rooms.find((room) => room.id === id) ?? null;
    },
    async lockById(id) {
      return rooms.find((room) => room.id === id) ?? null;
    }
  };
}

module.exports = { createRoomsRepository };
