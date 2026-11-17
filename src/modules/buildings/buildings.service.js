const { NotFoundError } = require("../../errors/AppError");

function createBuildingsService({ runInTransaction }) {
  return {
    async listBuildings() {
      return runInTransaction(({ buildings }) => buildings.findAll());
    },

    async getBuilding(id) {
      return runInTransaction(async ({ buildings }) => {
        const building = await buildings.findById(id);
        if (!building) throw new NotFoundError("Building");
        return building;
      });
    },

    async createBuilding(input) {
      return runInTransaction(({ buildings }) => buildings.create(input));
    },

    async listRooms(buildingId) {
      return runInTransaction(async ({ buildings, rooms }) => {
        const building = await buildings.findById(buildingId);
        if (!building) throw new NotFoundError("Building");
        return rooms.findByBuildingId(buildingId);
      });
    }
  };
}

module.exports = { createBuildingsService };
