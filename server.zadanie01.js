const express = require("express");
const app = express();
app.use(express.json());
const rooms = [
  { id: 1, name: "ABC1", capacity: 6 },
  { id: 2, name: "ABC2", capacity: 12 },
  { id: 3, name: "ABC3", capacity: 4 },
  { id: 4, name: "ABC4", capacity: 8 }
];

app.get("/api/rooms", (req, res) => {
  res.json(rooms);
});
app.get("/api/rooms/:id", (req, res) => {
  const id = Number(req.params.id);
  const room = rooms.find((room) => room.id === id);
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }
  res.json(room);
});


let reservations = [];
let nextReservationId = 1;

app.post("/api/reservations", (req, res) => {
  const { roomId, reservedBy, participants, date } = req.body;
  if (roomId === undefined || roomId === null || roomId === "") {
    return res.status(400).json({ message: "roomId is required" });
  }
  const room = rooms.find((room) => room.id === Number(roomId));
  if (!room) {
    return res.status(404).json({ message: "Room not found" });
  }
  if (!reservedBy || String(reservedBy).trim() === "") {
    return res.status(400).json({ message: "reservedBy is required" });
  }
  if (typeof participants !== "number" || participants <= 0) {
    return res.status(400).json({ message: "participants must be a number greater than 0" });
  }
  if (!date || String(date).trim() === "") {
    return res.status(400).json({ message: "date is required" });
  }

  if (participants > room.capacity) {
  return res.status(409).json({ message: "Room capacity exceeded" });
    }

  const reservation = {
    id: nextReservationId++,
    roomId: Number(roomId),
    reservedBy: String(reservedBy).trim(),
    participants,
    date,
    status: "CONFIRMED"
  };
  reservations.push(reservation);
  res.status(201).json(reservation);
});


app.get("/api/reservations", (req, res) => {
  const { roomId } = req.query;
  if (roomId === undefined) {
    return res.json(reservations);
  }
  const id = Number(roomId);
  const result = reservations.filter((reservation) => reservation.roomId === id);
  res.json(result);
});


app.patch("/api/reservations/:id/cancel", (req, res) => {
  const id = Number(req.params.id);
  const reservation = reservations.find((reservation) => reservation.id === id);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }
  if (reservation.status !== "CANCELLED") {
    reservation.status = "CANCELLED";
  }
  res.json(reservation);
});


app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

