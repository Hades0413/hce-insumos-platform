import { ErrorCode, ErrorDetail, RpcErrorPayload } from '@hce/contracts';

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: readonly ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }

  toPayload(): RpcErrorPayload {
    return { code: this.code, message: this.message, ...(this.details?.length ? { details: this.details } : {}) };
  }

  static notFound(message: string): AppError {
    return new AppError(ErrorCode.NOT_FOUND, message);
  }

  static validation(message: string, details?: readonly ErrorDetail[]): AppError {
    return new AppError(ErrorCode.VALIDATION_ERROR, message, details);
  }

  static businessRule(message: string, details?: readonly ErrorDetail[]): AppError {
    return new AppError(ErrorCode.BUSINESS_RULE, message, details);
  }
}
