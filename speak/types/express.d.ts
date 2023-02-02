import { User } from '../src/services/users';

declare global {
  namespace Express {

    export interface Request {
      user: User
      uuid: string
    }
  }
}
