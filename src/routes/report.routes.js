import express from "express";
import {
  getRevenueSummary,
  getTopProducts,
  getRevenueChart,
} from "../controllers/report.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/revenue-summary", authenticate, getRevenueSummary);
router.get("/top-products", authenticate, getTopProducts);
router.get("/revenue-chart", authenticate, getRevenueChart);

export default router;
