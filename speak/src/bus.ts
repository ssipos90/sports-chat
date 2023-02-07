import { PubSub } from './lib/pubsub';

export const bus = PubSub<{
  ChatCreated: ChatCreated
  ChatMessageReceived: ChatMessageReceived
}>();
