import * as orderService from '../services/order.service.js';
import * as midtransService from '../services/midtrans.service.js';

const createOrder = async (req, res) => {
  // 
  try {
    const { items, user, paymentMethod } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Items wajib diisi dan harus berupa array'
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        message: 'Payment method wajib diisi'
      });
    }

    // 1. Buat order
    const order = await orderService.createOrder(items, user?.id, paymentMethod);

    // 2. generate pembayaran qris dengan midtrans
    if (paymentMethod === 'qris') {
      const transaction = await midtransService.createTransaction(order);
      console.log(transaction);

      return res.status(201).json({
        message: 'Pesanan berhasil dibuat, silakan lanjutkan pembayaran',
        data: {
          orderId: order.id,
          total: order.total,
          paymentUrl: transaction.redirect_url,
          token: transaction.token
        }
      });
    } else {
      return res.status(201).json({
        message: 'Pesanan berhasil dibuat, silakan bayar di tempat',
        data: {
          orderId: order.id,
          total: order.total
        }
      });
    }
  } catch (err) {
    res.status(500).json({
      error: err.message
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