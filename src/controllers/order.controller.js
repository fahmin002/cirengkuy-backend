import * as orderService from "../services/order.service.js";
import * as midtransService from "../services/midtrans.service.js";
import prisma from "../config/db.js";
export const createOrder = async (req, res) => {
  try {
    const result = await orderService.createOrder(
      req.body,
      req.user || null, // 🔥 ambil dari middleware auth
    );

    res.status(201).json({
      success: true,
      message:
        result.paymentMethod === "qris"
          ? "Pesanan dibuat, lanjutkan pembayaran"
          : "Pesanan berhasil (bayar di tempat)",
      data: result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
const getOrder = async (req, res) => {
  try {
    const { code } = req.params;
    const order = await orderService.getOrderByCode(code);

    if (!order) {
      return res.status(404).json({
        message: "Pesanan tidak ditemukan",
      });
    }

    res.json({
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();

    res.json(orders);
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const getOrdersByPhone = async (req, res) => {
  try {
    const { phone, status } = req.params;
    const orders = await orderService.getOrdersByPhone(phone, status);

    res.json({
      data: orders,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { code } = req.params;
    const { status } = req.body;

    const allowed = [
      "pending",
      "paid",
      "cooking",
      "ready",
      "completed",
      "cancelled",
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        message: "Status tidak valid",
      });
    }

    // validasi transisi status
    const current = await prisma.order.findUnique({ where: { code } });
    const flow = {
      pending: ["paid", "cancelled"],
      paid: ["cooking", "cancelled"],
      cooking: ["ready"],
      ready: ["completed"],
      completed: [],
      cancelled: [],
    };

    if (!flow[current.status].includes(status)) {
      return res.status(400).json({
        message: `Transisi status tidak valid dari ${current.status} ke ${status}`,
      });
    }

    const order = await orderService.updateOrderStatus(code, status);

    res.json({
      message: "Status pesanan berhasil diperbarui",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

const getOrderByQuery = async (req, res) => {
  const { status, q } = req.query;

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      OrderItem: { include: { Product: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  res.json({ data: orders });
};

const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.cancelOrder(id);
    res.json({
      message: "Pesanan dibatalkan",
      data: order,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
};

export default {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrderStatus,
  getOrdersByPhone,
  getOrderByQuery,
  cancelOrder,
};
