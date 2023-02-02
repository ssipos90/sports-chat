import assert from 'assert';
import { maybe } from 'typescript-monads';

export const logExitErrorStack = (): void => {
  const originalExit = process.exit;
  process.exit = (code?: number | undefined): never => {
    if (code !== 0) console.log(new Error().stack);
    return originalExit(code);
  };
};

export const sequence = async <T = unknown>(seq: Array<(a: unknown) => Promise<T>>): Promise<T[]> =>
  await seq.reduce(
    async (prev: Promise<T[]>, next, i) => {
      const carry = await prev;
      return carry.concat([
        await next(i > 0 ? undefined : carry[i - 1]),
      ]);
    },
    Promise.resolve([]),
  );

export const isString = (v: unknown): v is string => typeof v === 'string' || v instanceof String;

export const isFn = (fn: unknown): fn is ((...args: unknown[]) => unknown) => !!(fn as boolean) && fn instanceof Function;

/** this is used as a type guard */
export const isNotNull = <T>(value: T | null): value is T => value !== null;

type ArrayOfHelper<T> = (v: unknown) => v is T;

/** this is used as a type guard */
export const isArrayOf = <T>(a: unknown, fn: ArrayOfHelper<T>): a is T[] => {
  if (!Array.isArray(a)) {
    return false;
  }
  return a.every(v => fn(v));
};

export const roundFloat = (num: number, decimals = 2): number => {
  const exp = Math.pow(10, decimals);

  return Math.round((num + Number.EPSILON) * exp) / exp;
};

export const env = (key: string, _default?: string | (() => string)): string | undefined =>
  maybe(process.env[key])
    .match({
      some: v => v,
      none: () => isFn(_default) ? _default() : _default,
    });

export const envAs = <T>(key: string, fn: ((v: string) => NonNullable<T>), _default?: NonNullable<T> | (() => NonNullable<T>)): NonNullable<T> | undefined =>
  maybe(process.env[key])
    .map(fn)
    .match({
      some: v => v,
      none: () => isFn(_default) ? _default() : _default,
    });

export const envAsInt = (key: string, def: number): NonNullable<number> | undefined => envAs<number>(key, v => {
  const _v = Number.parseInt(v);

  assert.ok(!Number.isNaN(_v), `Cannot parse env "${key}" as Int.`);

  return _v;
}, def);

export const envStrict = (key: string): string =>
  maybe(process.env[key])
    .valueOrThrow(`No environment variable found '${key}'.`);

export const envStrictAs = <T>(key: string, fn: ((v: string) => T)): T => fn(envStrict(key));

export const envStrictAsInt = (key: string): number => envStrictAs<number>(key, v => {
  const _v = Number.parseInt(v);

  assert.ok(!Number.isNaN(_v), `Cannot parse env "${key}" as Int.`);

  return _v;
});
