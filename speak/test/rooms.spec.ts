import { expect } from 'chai';
import { createRoom } from '../src/services/rooms';

describe('rooms operations', function () {
  it('creates a room', async function () {
    const room = await createRoom();
    expect(room).to.haveOwnProperty('_id');
    expect(room._id).to.be.a('string').and.have.lengthOf(36);
  });
});
