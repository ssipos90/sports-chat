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
