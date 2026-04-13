import WebSocket from "ws";
import type { Logger } from "../../../shared/logger/logger";

interface Subscription {
  key: string;
  topic: string;
  params: unknown[];
  handler: (payload: Record<string, unknown>) => void;
}

interface JsonRpcMessage {
  result?: Record<string, unknown>;
  params?: {
    result?: Record<string, unknown>;
  };
  error?: {
    code?: number;
    message?: string;
  };
}

interface WssStatus {
  connected: boolean;
  subscriptions: number;
  reconnectDelayMs: number;
  eventMessages: number;
  lastMessageAt?: string;
}

const HEARTBEAT_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const subscriptionKey = (topic: string, params: unknown[]): string => `${topic}:${JSON.stringify(params)}`;
const asRecord = (value: unknown): Record<string, unknown> | null => {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
};
const resolveResultPayload = (message: JsonRpcMessage): Record<string, unknown> | null => {
  const direct = asRecord(message.result);
  if (direct) {
    return direct;
  }

  return asRecord(asRecord(message.params)?.result);
};

export class AveWssManager {
  private ws: WebSocket | null = null;
  private reconnectDelayMs = 1_000;
  private messageId = 1;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private shouldReconnect = true;
  private lastMessageAt: number | null = null;
  private eventMessages = 0;
  private readonly subscriptions = new Map<string, Subscription>();

  public constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly logger: Logger,
  ) {}

  public connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    this.ws = new WebSocket(this.buildEndpoint(), {
      headers: {
        "X-API-KEY": this.apiKey,
      },
    });
    this.ws.on("open", () => this.handleOpen());
    this.ws.on("message", (data) => this.handleMessage(String(data)));
    this.ws.on("close", () => this.handleClose());
    this.ws.on("error", (error) => this.logger.warn("WSS error", { error: String(error) }));
  }

  public close(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
  }

  public subscribe(topic: string, params: unknown[], handler: Subscription["handler"]): void {
    const key = subscriptionKey(topic, params);
    this.subscriptions.set(key, { key, topic, params, handler });
    this.send("subscribe", [topic, ...params]);
  }

  public unsubscribe(topic: string, params: unknown[]): void {
    const key = subscriptionKey(topic, params);
    if (!this.subscriptions.has(key)) {
      return;
    }

    this.subscriptions.delete(key);
    this.send("unsubscribe", [topic, ...params]);
  }

  public getStatus(): WssStatus {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      subscriptions: this.subscriptions.size,
      reconnectDelayMs: this.reconnectDelayMs,
      eventMessages: this.eventMessages,
      ...(this.lastMessageAt ? { lastMessageAt: new Date(this.lastMessageAt).toISOString() } : {}),
    };
  }

  private buildEndpoint(): string {
    const query = new URLSearchParams({
      "AVE-ACCESS-KEY": this.apiKey,
      ave_access_key: this.apiKey,
      "X-API-KEY": this.apiKey,
    });
    const separator = this.url.includes("?") ? "&" : "?";
    return `${this.url}${separator}${query.toString()}`;
  }

  private handleOpen(): void {
    this.reconnectDelayMs = 1_000;
    this.startHeartbeat();
    this.subscriptions.forEach((subscription) => this.send("subscribe", [subscription.topic, ...subscription.params]));
    this.logger.info("WSS connected", { ...this.getStatus() });
  }

  private handleClose(): void {
    this.stopHeartbeat();
    this.ws = null;
    if (!this.shouldReconnect) {
      return;
    }

    setTimeout(() => {
      this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
      this.connect();
    }, this.reconnectDelayMs);
  }

  private handleMessage(raw: string): void {
    if (raw === "pong") {
      this.lastMessageAt = Date.now();
      return;
    }

    let parsed: JsonRpcMessage;
    try {
      parsed = JSON.parse(raw) as JsonRpcMessage;
    } catch (error) {
      this.logger.warn("WSS message parse failed", { error: String(error), raw });
      return;
    }

    if (parsed.error) {
      this.logger.warn("WSS returned error", {
        code: parsed.error.code,
        message: parsed.error.message,
      });
      return;
    }

    const result = resolveResultPayload(parsed);
    if (!result) {
      return;
    }

    this.lastMessageAt = Date.now();
    const topic = String(result.topic ?? "");
    this.eventMessages += 1;
    const matching = [...this.subscriptions.values()].filter((subscription) => subscription.topic === topic);
    matching.forEach((subscription) => subscription.handler(result));
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send("ping", []);
    }, HEARTBEAT_MS);
  }

  private stopHeartbeat(): void {
    if (!this.heartbeatTimer) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
  }

  private send(method: string, params: unknown[]): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.ws.send(JSON.stringify({ jsonrpc: "2.0", method, params, id: this.messageId }));
    this.messageId += 1;
  }
}
