function createReservationsRepository(seed = []) {
  const reservations = structuredClone(seed);
  let nextId = Math.max(0, ...reservations.map((reservation) => reservation.id)) + 1;

  return {
    async findById(id) {
      return reservations.find((reservation) => reservation.id === id) ?? null;
    },
    async list({ roomId } = {}) {
      if (roomId === undefined) return reservations;
      return reservations.filter((reservation) => reservation.roomId === roomId);
    },
    async findConfirmedByRoomId(roomId) {
      return reservations.filter((reservation) => {
        return reservation.roomId === roomId && reservation.status === "CONFIRMED";
      });
    },
    async create(data) {
      const reservation = { id: nextId++, ...data };
      reservations.push(reservation);
      return reservation;
    },
    async markCancelled(id, cancelledAt) {
      const reservation = reservations.find((item) => item.id === id);
      reservation.status = "CANCELLED";
      reservation.cancelledAt = cancelledAt;
      return reservation;
    }
  };
}

module.exports = { createReservationsRepository };
