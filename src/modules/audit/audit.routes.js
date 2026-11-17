const { Router } = require("express");
const validate = require("../../middleware/validate");
const { listAuditQuery } = require("./audit.schemas");

function createAuditRouter(controller) {
  const router = Router();
  router.get("/", validate({ query: listAuditQuery }), controller.list);
  return router;
}

module.exports = { createAuditRouter };
