import { hash } from 'bcrypt';
import { redis } from '../redis';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

export interface FullUser {
  _id: string
  username: string
  passwordHash: string
}

export type User = Omit<FullUser, 'passwordHash'>;

interface CreateUser {
  username: string
  password: string
}

const v = z.object({
  username: z.string().min(3).max(15),
  password: z.string(),
});

export async function registerUserValidator (input: unknown): Promise<User> {
  const data = await v.parseAsync(input);

  return await registerUser(data);
}

export async function registerUser ({ username, password, ...userData }: CreateUser): Promise<User> {
  const count = await redis.exists(username);
  if (count > 0) {
    throw new Error('Username is taken.');
  }
  const passwordHash = await hash(password, 10);

  const user = {
    ...userData,
    _id: uuid(),
    username,
  };

  const pipe = redis.pipeline();

  pipe.hset(
    `user:${user._id}`,
    'data',
    JSON.stringify(user),
    'passwordHash',
    passwordHash,
  );
  pipe.set(`usernameId:${user.username}`, user._id);

  const results = await pipe.exec();
  if (results === null) {
    throw new Error('Results is null.');
  }

  for (const result of results) {
    if (result[0] !== null) {
      console.error(result[0]);
      throw new Error('Failed saving user.');
    }
  }

  return user;
};

export async function getUser (id: string): Promise<User | null> {
  const userData = await redis.hget(`user:${id}`, 'data');

  if (userData === null) {
    return null;
  }

  return JSON.parse(userData);
}

export async function getUsers (ids: string[]): Promise<User[]> {
  const pipe = redis.pipeline();
  for (const id of ids) {
    pipe.hget(`user:${id}`, 'data');
  }
  const results = await pipe.exec();

  if (results === null) {
    throw new Error('Null result.');
  }

  return results.map(([err, user]) => {
    if (err) {
      console.error(err);
      throw new Error('Failed fetching users.');
    }

    return user as User;
  });
}

export async function getUserByUsername (username: string): Promise<FullUser> {
  interface UserData {
    data: string
    passwordHash: string
  }
  function isUserData (userData: object): userData is UserData {
    return 'data' in userData && 'passwordHash' in userData;
  }
  const userId = await redis.get(`usernameId:${username}`);
  if (!userId) {
    throw new Error('Unknown username.');
  }

  const smf = `user:${userId}`;

  const userData = await redis.hgetall(smf);

  if (!isUserData(userData)) {
    throw new Error('User data is malformed');
  }

  return {
    ...JSON.parse(userData.data) as User,
    passwordHash: userData.passwordHash,
  };
}
