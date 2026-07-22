import { Types } from 'mongoose';
import { Errors, HttpCode, Message } from './Errors';

export const AUTH_TIMER: number = 24; // hours

export const MORGAN_FORMAT: string =
  ':method :url :status :res[content-length] - :response-time ms';

export function shapeIntoMongooseObjectId(input: any): Types.ObjectId {
  if (typeof input === 'string' && Types.ObjectId.isValid(input)) {
    return new Types.ObjectId(input);
  }
  if (input instanceof Types.ObjectId) return input;
  throw new Errors(HttpCode.BAD_REQUEST, Message.BAD_REQUEST);
}
