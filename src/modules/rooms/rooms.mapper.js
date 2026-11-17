function toRoomResponse(room) {
  const response = {
    id: room.id,
    name: room.name,
    capacity: room.capacity
  };
  if (room.building) response.building = room.building;
  else if (room.buildingId !== undefined) response.buildingId = room.buildingId;
  return response;
}

module.exports = { toRoomResponse };
