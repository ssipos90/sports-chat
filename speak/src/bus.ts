import { PubSub } from './lib/pubsub';
import { ChatCreated, ChatMessageReceived } from './services/chat';

export const bus = PubSub<{
  ChatCreated: ChatCreated
  ChatMessageReceived: ChatMessageReceived
}>();
