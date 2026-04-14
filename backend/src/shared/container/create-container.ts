import type { AppConfig } from "../config/env";
import type { Logger } from "../logger/logger";
import { AveDataClient } from "../clients/ave/ave-client";
import { AveTradingClient } from "../clients/ave-trading/ave-trading-client";
import { SupabaseRestClient } from "../clients/supabase/supabase-rest-client";
import { MonitoringRepository } from "../../features/monitoring/monitoring.repository";
import { CabalModuleService } from "../../features/monitoring/modules/cabal/cabal.service";
import { DevDrainModuleService } from "../../features/monitoring/modules/dev-drain/dev-drain.service";
import { ConvictionModuleService } from "../../features/monitoring/modules/conviction/conviction.service";
import { DcaModuleService } from "../../features/monitoring/modules/dca/dca.service";
import { NarrativeModuleService } from "../../features/monitoring/modules/narrative/narrative.service";
import { WashModuleService } from "../../features/monitoring/modules/wash/wash.service";
import { RetentionModuleService } from "../../features/monitoring/modules/retention/retention.service";
import { DivergenceModuleService } from "../../features/monitoring/modules/divergence/divergence.service";
import { TosService } from "../../features/monitoring/tos/tos.service";
import { MonitoringService } from "../../features/monitoring/monitoring.service";
import { MonitoringController } from "../../features/monitoring/monitoring.controller";
import { IngestionService } from "../../features/ingestion/ingestion.service";
import { AveWssManager } from "../../features/ingestion/wss/ave-wss-manager";
import { WatchlistPersistenceRepository } from "../../features/persistence/watchlist-persistence.repository";
import { MonitoringPersistenceRepository } from "../../features/persistence/monitoring-persistence.repository";
import { TradeActionsRepository } from "../../features/persistence/trade-actions.repository";
import { TradeExecutionsRepository } from "../../features/persistence/trade-executions.repository";
import { RiskGateService } from "../../features/trading/risk-gate.service";
import { TradingService } from "../../features/trading/trading.service";
import { TradingController } from "../../features/trading/trading.controller";

export interface AppContainer {
  monitoringController: MonitoringController;
  monitoringService: MonitoringService;
  ingestionService: IngestionService;
  tradingController?: TradingController;
}

const createWssManager = (config: AppConfig, logger: Logger): AveWssManager | undefined => {
  if (!config.enableWssIngestion) {
    return undefined;
  }

  return new AveWssManager(config.aveWssUrl, config.aveDataApiKey, logger);
};

export const createContainer = (config: AppConfig, logger: Logger): AppContainer => {
  const client = new AveDataClient(config.aveDataBaseUrl, config.aveDataApiKey, logger);
  const supabaseClient =
    config.supabaseUrl && config.supabaseApiKey
      ? new SupabaseRestClient(config.supabaseUrl, config.supabaseApiKey)
      : undefined;
  const watchlistPersistence = supabaseClient ? new WatchlistPersistenceRepository(supabaseClient, logger) : undefined;
  const monitoringPersistence = supabaseClient ? new MonitoringPersistenceRepository(supabaseClient, logger) : undefined;
  const repository = new MonitoringRepository();
  const cabalModule = new CabalModuleService(client);
  const drainModule = new DevDrainModuleService(client);
  const convictionModule = new ConvictionModuleService(client);
  const dcaModule = new DcaModuleService(client);
  const narrativeModule = new NarrativeModuleService(client, repository);
  const washModule = new WashModuleService(client);
  const retentionModule = new RetentionModuleService(client);
  const divergenceModule = new DivergenceModuleService(client);
  const tosService = new TosService();
  const monitoringService = new MonitoringService(
    client,
    repository,
    cabalModule,
    drainModule,
    convictionModule,
    dcaModule,
    narrativeModule,
    washModule,
    retentionModule,
    divergenceModule,
    tosService,
    logger,
    monitoringPersistence,
  );
  const monitoringController = new MonitoringController(
    monitoringService,
    config.defaultUserId,
    watchlistPersistence,
  );
  const ingestionService = new IngestionService(
    client,
    monitoringService,
    logger,
    config.monitoringPollIntervalMs,
    config.watchlistLimit,
    createWssManager(config, logger),
  );
  let tradingController: TradingController | undefined;
  if (supabaseClient) {
    const tradingClient = new AveTradingClient(
      config.aveBotBaseUrl,
      config.aveBotApiKey,
      config.aveBotApiSecret,
      logger,
    );
    const tradingService = new TradingService(
      tradingClient,
      new TradeActionsRepository(supabaseClient),
      new TradeExecutionsRepository(supabaseClient),
      new RiskGateService(),
      logger,
    );
    monitoringService.subscribeSnapshots((snapshot, watchlistsByUser) => {
      return tradingService.ingestSnapshot(snapshot, watchlistsByUser);
    });
    tradingController = new TradingController(tradingService, monitoringService, config.defaultUserId);
  }

  return {
    monitoringController,
    monitoringService,
    ingestionService,
    tradingController,
  };
};
