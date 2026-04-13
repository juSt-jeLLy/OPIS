export interface AppErrorOptions {
  statusCode: number;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  public constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.statusCode = options.statusCode;
    this.code = options.code;
    this.details = options.details;
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
