import { z } from 'zod';
import { parse as parseUuid } from 'uuid';
export { v4 as uuid } from 'uuid';

export const idValidator = z.string().refine(v => {
  try {
    parseUuid(v);
    return true;
  } catch {
    return false;
  }
});

interface Delayer {
  <V>(v: V): Promise<V>
  (): Promise<void>
}

export const delay = (ms: number): Delayer => {
  function _delay (): Promise<void>;
  function _delay <V> (v: V): Promise<V>;

  async function _delay (v?: unknown): Promise<unknown> {
    return await new Promise(resolve => setTimeout(() => resolve(v), ms));
  }

  return _delay;
};
