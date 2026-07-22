export enum HttpCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = 'Something went wrong, please try again later.',
  NO_DATA_FOUND = 'No data found.',
  CREATE_FAILED = 'Failed to create the requested resource.',
  UPDATE_FAILED = 'Failed to update the requested resource.',
  BAD_REQUEST = 'Invalid request data.',
  NOT_AUTHENTICATED = 'You are not authenticated, please log in.',
  NOT_ALLOWED = 'You are not allowed to perform this action.',
  USED_MEMBER_NICK_OR_PHONE = 'Nickname or phone number is already in use.',
  NO_MEMBER_NICK = 'No member found with that nickname.',
  WRONG_PASSWORD = 'Password does not match.',
}

export class Errors extends Error {
  code: HttpCode;
  message: Message;

  constructor(code: HttpCode, message: Message) {
    super(message);
    this.code = code;
    this.message = message;
  }

  static standard = new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.SOMETHING_WENT_WRONG);
}
