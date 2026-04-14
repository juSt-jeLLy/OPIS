import cors from "cors";
import express from "express";
import type { AppContainer } from "./shared/container/create-container";
import type { AppConfig } from "./shared/config/env";
import { createErrorMiddleware } from "./shared/errors/error-middleware";
import type { Logger } from "./shared/logger/logger";
import { createMonitoringRoutes } from "./features/monitoring/monitoring.routes";
import { createTradingRoutes } from "./features/trading/trading.routes";

export const createApp = (container: AppContainer, config: AppConfig, logger: Logger) => {
  const app = express();

  app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", service: "opis-monitoring", time: new Date().toISOString() });
  });

  app.use("/api/monitoring", createMonitoringRoutes(container.monitoringController));
  if (container.tradingController) {
    app.use("/api/trading", createTradingRoutes(container.tradingController));
  }
  app.use(createErrorMiddleware(logger));
  return app;
};
