function registerNotificationListeners(eventBus, db) {
  eventBus.subscribe("reservation.cancelled", async (event) => {
    const { userId, cancelledBy, reservationId } = event.payload;
    if (userId === cancelledBy) return;

    const canceller = await db("users").where({ id: cancelledBy }).first();
    if (!canceller || canceller.role !== "ADMIN") return;

    const owner = await db("users").where({ id: userId }).first();
    if (!owner) return;

    console.log(`[notification] to: ${owner.email} reservation #${reservationId} was cancelled by an administrator`);
  });
}

module.exports = { registerNotificationListeners };
