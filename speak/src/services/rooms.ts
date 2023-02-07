import { uuid } from 'src/lib/misc';
import { redis } from 'src/redis';

export interface Room {
  _id: ID
}

export async function createRoom (): Promise<Room> {
  const room: Room = {
    _id: uuid(),
  };

  await redis.hset(`room:${room._id}`, 'room', JSON.stringify(room));

  console.log(`created room ${room._id}.`);

  return room;
};

export async function loadRoom (roomId: ID): Promise<Room | null> {
  const roomData = await redis.hget(`room:${roomId}`, 'room');
  if (roomData === null) {
    return null;
  }

  // TODO: we will trust our past self that 'room' is valid
  return JSON.parse(roomData);
}
