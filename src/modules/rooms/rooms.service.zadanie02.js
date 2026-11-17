const { NotFoundError } = require("../../errors/AppError");

function createRoomsService({ roomsRepository }) {
  return {
    async listRooms() {
      return roomsRepository.findAll();
    },
    async getRoom(id) {
      const room = await roomsRepository.findById(id);
      if (!room) throw new NotFoundError("Room");
      return room;
    }
  };
}

module.exports = { createRoomsService };
