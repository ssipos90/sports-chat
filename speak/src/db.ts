import { MongoClient } from 'mongodb';
import { mongodb as config } from './config';

// Replace the uri string with your connection string.
export const client = new MongoClient(config.uri, config.options);

export async function connect (): Promise<void> {
  try {
    await client.connect();
  } finally {
    process.on('beforeExit', function () {
      client.close()
        .catch(e => console.error(e));
    });
  }
}
