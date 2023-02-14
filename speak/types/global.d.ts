import _fetch from 'node-fetch';

declare global {
  type ID = string;

  const fetch: typeof _fetch;
}
