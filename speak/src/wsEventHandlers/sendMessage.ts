import { v4 as uuid } from 'uuid';
import { WsEventHandler } from './services/ws';

// export const sendMessageValidator = baseMessageValidator.extend({
//   event: z.literal('sendMessage'),
//   payload: z.object({
//     roomId: z.string(),
//     body: z.string().min(1).max(200),
//   }),
// });

interface SendMessage {
  roomId: ID
  body: string
}

export const sendMessage: WsEventHandler<SendMessage> = async (_client, wsMessage, context) => {
  context.sendMessage({
    ...wsMessage.payload,
    _id: uuid(),
    ts: wsMessage.ts,
    userId: wsMessage.userId,
  });
};
