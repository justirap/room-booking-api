const { createEventBus } = require("../../src/events/eventBus");

test("a failing listener does not break publish or the next listener", async () => {
  const bus = createEventBus();
  const seen = [];
  const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

  bus.subscribe("reservation.created", () => {
    throw new Error("audit listener failed");
  });
  bus.subscribe("reservation.created", () => {
    seen.push("ok");
  });

  expect(() => bus.publish("reservation.created", { reservationId: 1 })).not.toThrow();
  await new Promise((resolve) => setTimeout(resolve, 20));

  expect(seen).toEqual(["ok"]);
  expect(errorSpy).toHaveBeenCalled();
  errorSpy.mockRestore();
});
