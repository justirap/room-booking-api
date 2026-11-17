const config = require("./config");
const db = require("./db/knex");
const { createApp } = require("./app");
const { createKnexUnitOfWork } = require("./db/unitOfWork");
const { createUsersRepository } = require("./modules/auth/users.repository.knex");
const { createAuditRepository } = require("./modules/audit/audit.repository.knex");
const { createEventBus } = require("./events/eventBus");
const { registerAuditListeners } = require("./events/auditListeners");
const { registerNotificationListeners } = require("./events/notificationListeners");

const eventBus = createEventBus();
registerAuditListeners(eventBus, db);
registerNotificationListeners(eventBus, db);

const app = createApp({
  config,
  runInTransaction: createKnexUnitOfWork(db).runInTransaction,
  usersRepository: createUsersRepository(db),
  eventBus,
  auditRepository: createAuditRepository(db)
});

const server = app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  if (typeof server.closeIdleConnections === "function") {
    server.closeIdleConnections();
  }
  server.close(async () => {
    try {
      await db.destroy();
    } finally {
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
