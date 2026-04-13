import "dotenv/config";

export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string;
  aveDataBaseUrl: string;
  aveDataApiKey: string;
  aveWssUrl: string;
  monitoringPollIntervalMs: number;
  watchlistLimit: number;
  enableWssIngestion: boolean;
}

const DEFAULT_PORT = 4090;
const DEFAULT_POLL_MS = 30_000;
const DEFAULT_WATCHLIST_LIMIT = 12;

const parseIntValue = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
};

const parseNodeEnv = (value: string | undefined): NodeEnvironment => {
  if (value === "test" || value === "production") {
    return value;
  }

  return "development";
};

const requireEnv = (name: string, value: string | undefined): string => {
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value.trim();
};

export const loadConfig = (): AppConfig => {
  return {
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    port: parseIntValue(process.env.PORT, DEFAULT_PORT),
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
    aveDataBaseUrl: process.env.AVE_DATA_BASE_URL ?? "https://prod.ave-api.com",
    aveDataApiKey: requireEnv("AVE_DATA_API_KEY", process.env.AVE_DATA_API_KEY),
    aveWssUrl: process.env.AVE_WSS_URL ?? "wss://wss.ave-api.xyz",
    monitoringPollIntervalMs: parseIntValue(process.env.MONITORING_POLL_INTERVAL_MS, DEFAULT_POLL_MS),
    watchlistLimit: parseIntValue(process.env.WATCHLIST_LIMIT, DEFAULT_WATCHLIST_LIMIT),
    enableWssIngestion: parseBoolean(process.env.ENABLE_WSS_INGESTION, false),
  };
};
