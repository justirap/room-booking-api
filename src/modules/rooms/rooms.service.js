const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ runInTransaction }) {
  return {
    async listRooms() {
      return runInTransaction(({ rooms }) => rooms.findAll());
    },

    async getRoom(id) {
      return runInTransaction(async ({ rooms }) => {
        const room = await rooms.findById(id);
        if (!room) throw new NotFoundError("Room");
        return room;
      });
    },

    async createRoom(input) {
      return runInTransaction(async ({ buildings, rooms }) => {
        const building = await buildings.findById(input.buildingId);
        if (!building) throw new NotFoundError("Building");
        return rooms.create(input);
      });
    }
  };
}

module.exports = { createRoomsService };
