import { z } from 'zod';
import { WsEventHandler } from '../services/ws';

const validator = z.object({
  roomId: z.string(),
});

export const joinRoom: WsEventHandler = async (client, wsMessage, context) => {
  const payload = await validator.parseAsync(wsMessage.payload);

  await context.joinRoom(client, payload.roomId);
};
