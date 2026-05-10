import express from "express";
import orderController from "../controllers/order.controller.js";
import { isAdmin } from "../middleware/role.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

// User & Payment Gateway
router.post("/", orderController.createOrder);
router.get("/:code", orderController.getOrder);
router.get("/customer/:phone", orderController.getOrdersByPhone);
router.get("/customer/:phone/:status", orderController.getOrdersByPhone);

// Admin
router.get("/all", authenticate, isAdmin, orderController.getAllOrders);
router.get("/", authenticate, isAdmin, orderController.getOrderByQuery);
router.patch(
  "/:code/status",
  authenticate,
  isAdmin,
  orderController.updateOrderStatus,
);

export default router;
