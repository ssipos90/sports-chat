import { hash } from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';

export interface FullUser {
  _id: string
  name: string
  password: string
}

export type User = Omit<FullUser, 'password'>;

const users: FullUser[] = [];

interface CreateUser {
  name: string
  password: string
}

const v = z.object({
  name: z.string().min(3).max(15),
  password: z.string(),
});

export async function registerUserValidator (input: unknown): Promise<User> {
  const data = await v.parseAsync(input);

  return await registerUser(data);
}

export async function registerUser ({ password, ...userData }: CreateUser): Promise<User> {
  const passwordHash = await hash(password, 10);

  const user = {
    ...userData,
    _id: uuid(),
  };

  users.push({
    ...user,
    password: passwordHash,
  });

  return user;
};

function cleanUser ({ password, ...user }: FullUser): User {
  return user;
}

export async function getUser (id: string): Promise<User | null> {
  const user = users.find(user => user._id === id);

  if (user === undefined) {
    return null;
  }

  return cleanUser(user);
}

export async function getUsers (ids: string[]): Promise<User[]> {
  return users
    .filter(user => ids.includes(user._id))
    .map(user => cleanUser(user));
}
