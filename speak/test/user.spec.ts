import assert from 'assert';
import { expect } from 'chai';
import { getUser, getUserByUsername, registerUser } from '../src/services/users';

describe('users', function () {
  it('registers an user and finds them', async function () {
    const user = await registerUser({
      username: 'sebi',
      password: '1q2w3e',
    });

    assert.equal(user.username, 'sebi');
    assert(typeof user._id === 'string');
    assert(!('password' in user), 'Password should not be returned');

    const user2 = await getUser(user._id);
    assert(user2);
    assert.equal(user2._id, user._id);
  });

  it('registered user can be found by username', async function () {
    await registerUser({
      username: 'sebi',
      password: '1q2w3e',
    });
    const user = await getUserByUsername('sebi');
    expect(user).to.have.haveOwnProperty('_id');
    expect(user._id).to.be.a('string').lengthOf(36); // uuid
    expect(user).to.have.haveOwnProperty('passwordHash');
    expect(user.passwordHash).to.be.a('string');

    expect(user).to.have.ownProperty('username', 'sebi');
    assert.equal(user._id, user._id);
  });
});
