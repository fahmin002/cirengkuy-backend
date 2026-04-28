import * as orderService from '../services/order.service.js';
import * as midtransService from '../services/midtrans.service.js';

export const createOrder = async (req, res) => {
  try {
    const result = await orderService.createOrder(
      req.body,
      req.user || null // 🔥 ambil dari middleware auth
    );

    res.status(201).json({
      success: true,
      message:
        result.paymentMethod === 'qris'
          ? 'Pesanan dibuat, lanjutkan pembayaran'
          : 'Pesanan berhasil (bayar di tempat)',
      data: result
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message
    });
  }
};
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);

    if (!order) {
      return res.status(404).json({
        message: 'Pesanan tidak ditemukan'
      });
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const orders = await orderService.getAllOrders();

    res.json(orders);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: 'Status wajib diisi'
      });
    }

    const order = await orderService.updateOrderStatus(id, status);

    res.json({
      message: 'Status pesanan berhasil diperbarui',
      data: order
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

export default {
  createOrder,
  getOrder,
  getAllOrders,
  updateOrderStatus
};