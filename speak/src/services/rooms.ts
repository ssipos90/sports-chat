import { uuid } from 'src/lib/misc';
import { redis } from 'src/redis';

export interface Room {
  _id: ID
  matchId: ID
}

interface CreateRoom {
  matchId: ID // TODO: request all match info to be able to generate room
}

export async function createRoom (data: CreateRoom): Promise<Room> {
  // TODO: we might need to extract match data
  const room: Room = {
    _id: uuid(),
    ...data,
  };

  const roomData = JSON.stringify(room);
  const pipe = redis.pipeline();
  pipe.lpush('rooms', roomData);
  pipe.hset(`room:${room._id}`, 'room', roomData);
  await pipe.exec();

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

export async function listRooms (): Promise<Room[]> {
  const roomsData = await redis.lrange('rooms', 0, -1);

  return roomsData.map(data => JSON.parse(data));
}
