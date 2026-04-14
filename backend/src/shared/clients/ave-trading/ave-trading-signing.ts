import { createHmac } from "node:crypto";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const stableJson = (input: unknown): JsonValue => {
  if (input === null || typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => stableJson(item));
  }

  if (!input || typeof input !== "object") {
    return "";
  }

  const record = input as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort((left, right) => left.localeCompare(right));
  const normalized: Record<string, JsonValue> = {};
  sortedKeys.forEach((key) => {
    normalized[key] = stableJson(record[key]);
  });
  return normalized;
};

const stableStringify = (value: unknown): string => {
  return JSON.stringify(stableJson(value));
};

export interface DelegateSignatureHeaders {
  "AVE-ACCESS-SIGN": string;
  "AVE-ACCESS-TIMESTAMP": string;
}

export const createDelegateSignature = (
  apiSecret: string,
  method: string,
  requestPath: string,
  body?: unknown,
): DelegateSignatureHeaders => {
  const timestamp = new Date().toISOString();
  const payload = `${timestamp}${method.toUpperCase()}${requestPath}${body ? stableStringify(body) : ""}`;
  const sign = createHmac("sha256", apiSecret).update(payload).digest("base64");

  return {
    "AVE-ACCESS-SIGN": sign,
    "AVE-ACCESS-TIMESTAMP": timestamp,
  };
};

