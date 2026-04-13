import type { Request } from "express";

const USER_ID_HEADER = "x-opis-user-id";

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return undefined;
};

export const resolveUserId = (request: Request, fallback: string): string => {
  const header = toStringValue(request.header(USER_ID_HEADER));
  if (header) {
    return header;
  }

  const query = toStringValue(request.query.userId);
  if (query) {
    return query;
  }

  return fallback;
};

