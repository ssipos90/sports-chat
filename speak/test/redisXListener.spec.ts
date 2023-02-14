import { expect } from 'chai';
import { uuid } from 'src/lib/misc';
import { redisXListen } from 'src/lib/redis';
import { startRedis } from 'src/services/redis';

describe('Redis X Listener', function () {
  const redis = startRedis();

  beforeEach('creates the redis stream name', function () {
    this.redisStream = `myteststream:${uuid()}`;
  });

  afterEach('deletes the redis stream', async function () {
    await redis.del(this.redisStream);
  });

  it('hooks into redis stream and waits for first message', function (done) {
    redisXListen(redis, {
      stream: this.redisStream as string,
      onStop (reason, error) {
        if (reason === 'error') {
          done(error);
        }
      },
      onMessage (_, field, value) {
        expect(field).to.equal('message');
        expect(value).to.equal('mymessage');
        setImmediate(done);

        return false;
      },
      onError (error) {
        console.warn('redisXListen errord: ', error);

        return false;
      },
    });

    setTimeout(() => {
      redis
        .xadd(this.redisStream, '*', 'message', 'mymessage')
        .catch(done);
    }, 30);
  });
});
