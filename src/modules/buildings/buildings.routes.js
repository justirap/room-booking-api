const { Router } = require("express");
const validate = require("../../middleware/validate");
const authorize = require("../../middleware/authorize");
const { idParams, createBuildingBody } = require("./buildings.schemas");

function createBuildingsRouter(controller) {
  const router = Router();
  router.use((req, res, next) => {
    if (req.method === "GET" || req.method === "HEAD") return next();
    return authorize("ADMIN")(req, res, next);
  });
  router.get("/", controller.list);
  router.post("/", validate({ body: createBuildingBody }), controller.create);
  router.get("/:id/rooms", validate({ params: idParams }), controller.listRooms);
  router.get("/:id", validate({ params: idParams }), controller.getById);
  return router;
}

module.exports = { createBuildingsRouter };
