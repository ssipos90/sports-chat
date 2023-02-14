import { idValidator, uuid } from 'src/lib/misc';
import { z } from 'zod';
import { WsEventHandler } from '../services/ws';

export const validator = z.object({
  _id: idValidator.optional(),
  roomId: idValidator,
  body: z.string().min(1).max(200),
});

export const sendMessage: WsEventHandler = async (client, wsMessage, context) => {
  const payload = await validator.parseAsync(wsMessage.payload);

  await context.sendMessage({
    ...payload,
    _id: payload._id ?? uuid(),
    userId: client.user._id,
  });
};
