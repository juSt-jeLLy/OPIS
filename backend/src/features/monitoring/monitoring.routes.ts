import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import type { MonitoringController } from "./monitoring.controller";

export const createMonitoringRoutes = (controller: MonitoringController): Router => {
  const router = Router();

  router.get("/overview", (request, response) => controller.getOverview(request, response));
  router.get("/stream", (request, response) => controller.streamOverview(request, response));
  router.get("/signals", (request, response) => controller.getSignals(request, response));
  router.get("/alerts", (request, response) => controller.getAlerts(request, response));
  router.get("/watchlist", asyncHandler((request, response) => controller.getWatchlist(request, response)));
  router.get("/tokens", asyncHandler((request, response) => controller.searchTokens(request, response)));
  router.post("/watchlist", asyncHandler((request, response) => controller.replaceWatchlist(request, response)));
  router.post("/analyze", asyncHandler((request, response) => controller.analyzeToken(request, response)));
  router.post("/run-cycle", asyncHandler((request, response) => controller.runWatchlistCycle(request, response)));

  return router;
};
