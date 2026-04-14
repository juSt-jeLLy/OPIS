import "dotenv/config";

export type NodeEnvironment = "development" | "test" | "production";

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string;
  aveDataBaseUrl: string;
  aveDataApiKey: string;
  aveWssUrl: string;
  aveBotBaseUrl: string;
  aveBotApiKey: string;
  aveBotApiSecret?: string;
  supabaseUrl?: string;
  supabaseApiKey?: string;
  defaultUserId: string;
  monitoringPollIntervalMs: number;
  watchlistLimit: number;
  enableWssIngestion: boolean;
}

const DEFAULT_PORT = 4090;
const DEFAULT_POLL_MS = 30_000;
const DEFAULT_WATCHLIST_LIMIT = 12;
const DEFAULT_USER_ID = "demo-user";

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

const optionalEnv = (value: string | undefined): string | undefined => {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  return value.trim();
};

const firstDefined = (values: Array<string | undefined>): string | undefined => {
  return values.find((value) => value !== undefined && value.trim().length > 0);
};

export const loadConfig = (): AppConfig => {
  const aveBotApiKey = firstDefined([process.env.AVE_BOT_API_KEY, process.env.AVE_DATA_API_KEY]);
  const supabaseApiKey = firstDefined([
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ]);

  return {
    nodeEnv: parseNodeEnv(process.env.NODE_ENV),
    port: parseIntValue(process.env.PORT, DEFAULT_PORT),
    corsOrigin: process.env.CORS_ORIGIN ?? "*",
    aveDataBaseUrl: process.env.AVE_DATA_BASE_URL ?? "https://prod.ave-api.com",
    aveDataApiKey: requireEnv("AVE_DATA_API_KEY", process.env.AVE_DATA_API_KEY),
    aveWssUrl: process.env.AVE_WSS_URL ?? "wss://wss.ave-api.xyz",
    aveBotBaseUrl: process.env.AVE_BOT_BASE_URL ?? "https://bot-api.ave.ai",
    aveBotApiKey: requireEnv("AVE_BOT_API_KEY or AVE_DATA_API_KEY", aveBotApiKey),
    aveBotApiSecret: optionalEnv(process.env.AVE_BOT_API_SECRET),
    supabaseUrl: optionalEnv(firstDefined([process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL])),
    supabaseApiKey: optionalEnv(supabaseApiKey),
    defaultUserId: process.env.DEFAULT_USER_ID?.trim() || DEFAULT_USER_ID,
    monitoringPollIntervalMs: parseIntValue(process.env.MONITORING_POLL_INTERVAL_MS, DEFAULT_POLL_MS),
    watchlistLimit: parseIntValue(process.env.WATCHLIST_LIMIT, DEFAULT_WATCHLIST_LIMIT),
    enableWssIngestion: parseBoolean(process.env.ENABLE_WSS_INGESTION, false),
  };
};
