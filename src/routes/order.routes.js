import express from "express";
import orderController from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

// User & Payment Gateway
router.post("/", orderController.createOrder);
router.get("/stats", authenticate, orderController.getStats);
router.get("/recent-orders", authenticate, orderController.getRecentOrders);
router.get("/:code", orderController.getOrder);
router.get("/customer/:phone", orderController.getOrdersByPhone);
// router.get("/customer/:phone/:status", orderController.getOrdersByPhone);
router.patch("/:id/cancel", orderController.cancelOrder);
// Admin
router.get("/all", authenticate, orderController.getAllOrders);
router.get("/", authenticate, orderController.getOrderByQuery);
router.patch(
  "/:code/status",
  authenticate,
  orderController.updateOrderStatus,
);

export default router;
