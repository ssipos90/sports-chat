import { expect } from 'chai';
import { uuid } from 'src/lib/misc';
import { createRoom } from 'src/services/rooms';

describe('rooms operations', function () {
  it('creates a room', async function () {
    const room = await createRoom({
      matchId: uuid(),
    });
    expect(room).to.haveOwnProperty('_id');
    expect(room._id).to.be.a('string').and.have.lengthOf(36);
  });
});
