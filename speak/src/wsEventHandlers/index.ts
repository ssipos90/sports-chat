import { WsEventHandlers } from '../services/ws';
import { joinRoom } from './joinRoom';
import { sendMessage } from './sendMessage';

export const wsEventHandlers: WsEventHandlers = {
  joinRoom,
  sendMessage,
};
