import type { SupabaseRestClient } from "../../shared/clients/supabase/supabase-rest-client";
import type { Logger } from "../../shared/logger/logger";
import type { MonitoringAlert, MonitoringSignal } from "../monitoring/monitoring.types";

const SIGNALS_TABLE = "monitoring_signals";
const ALERTS_TABLE = "monitoring_alerts";

interface SignalRow {
  source_id: string;
  token_id: string;
  chain: string;
  symbol: string;
  module: string;
  score: number;
  severity: string;
  summary: string;
  metrics: unknown;
  created_at: string;
}

interface AlertRow {
  source_id: string;
  token_id: string;
  chain: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
}

const mapSignal = (signal: MonitoringSignal): SignalRow => ({
  source_id: signal.id,
  token_id: signal.tokenId,
  chain: signal.chain,
  symbol: signal.symbol,
  module: signal.module,
  score: signal.score,
  severity: signal.severity,
  summary: signal.summary,
  metrics: signal.metrics,
  created_at: signal.createdAt,
});

const mapAlert = (alert: MonitoringAlert): AlertRow => ({
  source_id: alert.id,
  token_id: alert.tokenId,
  chain: alert.chain,
  severity: alert.severity,
  title: alert.title,
  message: alert.message,
  created_at: alert.createdAt,
});

export class MonitoringPersistenceRepository {
  private suspendedUntil = 0;

  public constructor(private readonly client: SupabaseRestClient, private readonly logger: Logger) {}

  private isSuspended(): boolean {
    return Date.now() < this.suspendedUntil;
  }

  private suspendWrites(error: unknown): void {
    this.suspendedUntil = Date.now() + 60_000;
    this.logger.error("Monitoring persistence temporarily suspended", { error: String(error) });
  }

  public async saveSignals(signals: MonitoringSignal[]): Promise<void> {
    if (signals.length === 0 || this.isSuspended()) {
      return;
    }

    try {
      await this.client.upsert(SIGNALS_TABLE, signals.map(mapSignal), "source_id");
    } catch (error) {
      this.suspendWrites(error);
    }
  }

  public async saveAlerts(alerts: MonitoringAlert[]): Promise<void> {
    if (alerts.length === 0 || this.isSuspended()) {
      return;
    }

    try {
      await this.client.upsert(ALERTS_TABLE, alerts.map(mapAlert), "source_id");
    } catch (error) {
      this.suspendWrites(error);
    }
  }
}
