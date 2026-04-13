import type { AppConfig } from "../config/env";
import type { Logger } from "../logger/logger";
import { AveDataClient } from "../clients/ave/ave-client";
import { MonitoringRepository } from "../../features/monitoring/monitoring.repository";
import { CabalModuleService } from "../../features/monitoring/modules/cabal/cabal.service";
import { DevDrainModuleService } from "../../features/monitoring/modules/dev-drain/dev-drain.service";
import { ConvictionModuleService } from "../../features/monitoring/modules/conviction/conviction.service";
import { DcaModuleService } from "../../features/monitoring/modules/dca/dca.service";
import { NarrativeModuleService } from "../../features/monitoring/modules/narrative/narrative.service";
import { TosService } from "../../features/monitoring/tos/tos.service";
import { MonitoringService } from "../../features/monitoring/monitoring.service";
import { MonitoringController } from "../../features/monitoring/monitoring.controller";
import { IngestionService } from "../../features/ingestion/ingestion.service";
import { AveWssManager } from "../../features/ingestion/wss/ave-wss-manager";

export interface AppContainer {
  monitoringController: MonitoringController;
  monitoringService: MonitoringService;
  ingestionService: IngestionService;
}

const createWssManager = (config: AppConfig, logger: Logger): AveWssManager | undefined => {
  if (!config.enableWssIngestion) {
    return undefined;
  }

  return new AveWssManager(config.aveWssUrl, config.aveDataApiKey, logger);
};

export const createContainer = (config: AppConfig, logger: Logger): AppContainer => {
  const client = new AveDataClient(config.aveDataBaseUrl, config.aveDataApiKey, logger);
  const repository = new MonitoringRepository();
  const cabalModule = new CabalModuleService(client);
  const drainModule = new DevDrainModuleService(client);
  const convictionModule = new ConvictionModuleService(client);
  const dcaModule = new DcaModuleService(client);
  const narrativeModule = new NarrativeModuleService(client, repository);
  const tosService = new TosService();
  const monitoringService = new MonitoringService(
    client,
    repository,
    cabalModule,
    drainModule,
    convictionModule,
    dcaModule,
    narrativeModule,
    tosService,
    logger,
  );
  const monitoringController = new MonitoringController(monitoringService);
  const ingestionService = new IngestionService(
    client,
    monitoringService,
    logger,
    config.monitoringPollIntervalMs,
    config.watchlistLimit,
    createWssManager(config, logger),
  );

  return {
    monitoringController,
    monitoringService,
    ingestionService,
  };
};
