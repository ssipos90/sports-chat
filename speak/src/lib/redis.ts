import Redis from 'ioredis';
import Debug from 'debug';

interface OnStop {
  stop: undefined
  error: Error
}

type OnStopArguments = {
  [K in keyof OnStop]: [type: K, data: OnStop[K]];
}[keyof OnStop];

interface XListenOptions {
  stream: string
  startId?: string
  onError: (error: Error) => boolean
  onMessage: (stream: string, field: string, value: string) => boolean
  onStop: (...args: OnStopArguments) => void
  maxErrors?: number
  timeout?: number
}

export function redisXListen (redis: Redis, options: XListenOptions): void {
  let errorCount = 0;
  const {
    onError,
    onStop,
    onMessage,
    stream,
    timeout = 0,
    maxErrors = 3,
    startId = '$',
  } = options;

  const debug = Debug(`redisXListen:${stream}`);

  debug('starting at %s with a timeout of %d', startId, timeout);

  let lastId = startId;
  let run = true;
  const _redis = redis.duplicate({
    enableAutoPipelining: false,
  });

  function listener (): void {
    debug('xread blocking');
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    _redis.xread('BLOCK', timeout, 'STREAMS', stream, lastId, (err, results) => {
      debug('xread called back.');
      let t = 0;
      if (err instanceof Error) {
        ++errorCount;
        debug(`redis xread failed ${errorCount} times. Last error is: %O`, err);
        run = onError(err);
        if (errorCount > maxErrors) {
          debug('Error count exceeded max, stopping.');
          onStop('error', err);
          return;
        }
      } else if (results === null) {
        // TODO: stream doesn't exist (check docs though)
        console.error('message stream does not exist in redis.');
      } else if (results === undefined) {
        console.warn('results are undefined for some reason.');
        // this is so Typescript shuts up.
        // results is undefined when err is set.
        return;
      } else {
        debug('we have results: %j', results);
        errorCount = 0;

        for (const [stream, items] of results) {
          for (const [id, [field, value]] of items) {
            try {
              run = onMessage(stream, field, value);
              lastId = id;
            } catch (e) {
              run = false;
              debug('onMessage error %O', e);
              onError(e instanceof Error ? e : new Error('onMessage throwed an error.'));
            }
          }
        }
      }

      if (run) {
        if (errorCount === 0) {
          setImmediate(listener);
        } else {
          t = errorCount * 1000;
          debug('waiting for a %d seconds before running', t);
          setTimeout(listener, t);
        }
      } else {
        debug('handler returned false, stopping...');
        onStop('stop', undefined);
      }
    });
  }

  debug('start looping');

  listener();
}
