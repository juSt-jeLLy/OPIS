import type { NextFunction, Request, Response } from "express";
import { isAppError } from "./app-error";
import type { Logger } from "../logger/logger";

interface ErrorPayload {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const toUnknownErrorPayload = (): ErrorPayload => {
  return {
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong while processing the request.",
  };
};

export const createErrorMiddleware = (logger: Logger) => {
  return (error: unknown, _request: Request, response: Response, _next: NextFunction): void => {
    if (isAppError(error)) {
      response.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
      return;
    }

    logger.error("Unhandled server error", {
      error: error instanceof Error ? error.message : "non-error",
    });

    response.status(500).json({
      error: toUnknownErrorPayload(),
    });
  };
};
