import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  readonly errorCode: string;

  constructor(params: {
    message: string;
    errorCode: string;
    statusCode: HttpStatus;
  }) {
    super(
      { message: params.message, errorCode: params.errorCode },
      params.statusCode,
    );
    this.errorCode = params.errorCode;
  }
}
