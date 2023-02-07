import { idValidator } from 'src/lib/misc';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { WsEventHandler } from '../services/ws';

export const validator = z.object({
  roomId: idValidator,
  body: z.string().min(1).max(200),
});

export const sendMessage: WsEventHandler = async (_client, wsMessage, context) => {
  const payload = await validator.parseAsync(wsMessage.payload);

  await context.sendMessage({
    ...payload,
    _id: uuid(),
    ts: wsMessage.ts,
    userId: wsMessage.userId,
  });
};
