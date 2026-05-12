import express from "express";
import prisma from "../config/db.js";
import * as orderService from "../services/order.service.js";
const router = express.Router();

router.post("/webhook", async (req, res) => {
  try {
    const { order_id, transaction_status } = req.body;

    const orderId = order_id.replace("CRK-", "");

    let status = "pending";
    if (transaction_status === "settlement") {
      status = "paid";
    } else if (transaction_status === "expire") {
      status = "cancelled";
      // Restock Product
      await orderService.restockOrder(orderId);
    } else if (transaction_status === "cancel") {
      status = "cancelled";
      await orderService.restockOrder(orderId);
    }

    await orderService.updatePaymentStatus(orderId, status);

    console.log(`Order ${orderId} status updated to ${status}`);

    res.sendStatus(200);
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.sendStatus(500);
  }
});

export default router;
