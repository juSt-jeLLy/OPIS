import { Router } from "express";
import { asyncHandler } from "../../shared/http/async-handler";
import type { TradingController } from "./trading.controller";

export const createTradingRoutes = (controller: TradingController): Router => {
  const router = Router();

  router.post("/quote", asyncHandler((request, response) => controller.quote(request, response)));
  router.post("/orders", asyncHandler((request, response) => controller.createOrder(request, response)));
  router.get("/orders/:orderId", asyncHandler((request, response) => controller.getOrderStatus(request, response)));

  router.get("/actions", asyncHandler((request, response) => controller.listActions(request, response)));
  router.post("/actions/:actionId/execute", asyncHandler((request, response) => controller.executeAction(request, response)));
  router.post("/signal-execute", asyncHandler((request, response) => controller.executeSignal(request, response)));
  router.post("/actions/:actionId/dismiss", asyncHandler((request, response) => controller.dismissAction(request, response)));
  router.get("/trades", asyncHandler((request, response) => controller.listTrades(request, response)));

  return router;
};
