const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiDocument = require("./docs/openapi.json");
const requestLogger = require("./middleware/requestLogger");
const authenticate = require("./middleware/authenticate");
const authorize = require("./middleware/authorize");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const { createAuthService } = require("./modules/auth/auth.service");
const { createAuthController } = require("./modules/auth/auth.controller");
const { createAuthRouter } = require("./modules/auth/auth.routes");
const { createBuildingsService } = require("./modules/buildings/buildings.service");
const { createBuildingsController } = require("./modules/buildings/buildings.controller");
const { createBuildingsRouter } = require("./modules/buildings/buildings.routes");
const { createRoomsService } = require("./modules/rooms/rooms.service");
const { createRoomsController } = require("./modules/rooms/rooms.controller");
const { createRoomsRouter } = require("./modules/rooms/rooms.routes");
const { createReservationsService } = require("./modules/reservations/reservations.service");
const { createReservationsController } = require("./modules/reservations/reservations.controller");
const { createReservationsRouter } = require("./modules/reservations/reservations.routes");
const { createAuditController } = require("./modules/audit/audit.controller");
const { createAuditRouter } = require("./modules/audit/audit.routes");

function createApp({ config, runInTransaction, usersRepository, now, eventBus, auditRepository }) {
  const app = express();
  app.use(requestLogger);
  app.use(express.json());

  const requireAuth = authenticate(config.JWT_SECRET);
  const authService = createAuthService({
    usersRepository,
    jwtSecret: config.JWT_SECRET,
    jwtExpiresIn: config.JWT_EXPIRES_IN
  });
  const buildingsService = createBuildingsService({ runInTransaction });
  const roomsService = createRoomsService({ runInTransaction });
  const reservationsService = createReservationsService({ runInTransaction, now, eventBus });

  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
  app.use("/api/auth", createAuthRouter({
    controller: createAuthController({ authService, usersRepository }),
    authenticate: requireAuth
  }));
  app.use("/api/buildings", requireAuth, createBuildingsRouter(createBuildingsController(buildingsService)));
  app.use("/api/rooms", requireAuth, createRoomsRouter(createRoomsController(roomsService)));
  app.use("/api/reservations", requireAuth, createReservationsRouter(createReservationsController(reservationsService)));
  if (auditRepository) {
    app.use(
      "/api/admin/audit-log",
      requireAuth,
      authorize("ADMIN"),
      createAuditRouter(createAuditController(auditRepository))
    );
  }

  app.get("/api/debug/crash", requireAuth, async () => {
    throw new Error("boom");
  });

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
