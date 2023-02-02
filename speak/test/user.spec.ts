import assert from 'assert';
import { getUser, registerUser } from '../src/services/users';

describe('users', function () {
  it('registers an user', async function () {
    const user = await registerUser({
      name: 'sebi',
      password: '1q2w3e',
    });

    assert.equal(user.name, 'sebi');
    assert(typeof user._id === 'string');
    assert(!('password' in user), 'Password should not be returned');

    const user2 = await getUser(user._id);
    assert(user2);
    assert.equal(user2._id, user._id);
  });
});
