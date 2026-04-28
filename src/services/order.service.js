import prisma from "../config/db.js";

export const createOrder = async (items, userId = null, paymentMethod = 'cash') => {
  // 1. Ambil data produk berdasarkan productId dari items
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } }
  });

  // 2. Validasi apakah semua productId valid
  if (products.length !== items.length) {
    throw new Error('Salah satu produk tidak ditemukan');
  }

  // 3. Hitung total harga
  let total = 0;
  const orderItemsData = items.map(item => {
    const product = products.find(p => p.id === item.productId);
    const subTotal = product.price * item.qty;
    total += subTotal;

    return {
      productId: item.productId,
      qty: item.qty,
      price: product.price
    };
  });
  // 4. Buat order dan order items dalam transaksi
  const order = await prisma.$transaction(async (tx) => {
    const newOrder = await tx.order.create({
      data: {
        userId,
        total,
        status: paymentMethod === 'qris' ? 'pending' : 'paid',
        paymentMethod,
        paidAt: paymentMethod === 'qris' ? null : new Date()
      }
    });

    await tx.orderItem.createMany({
      data: orderItemsData.map(item => ({
        ...item,
        orderId: newOrder.id
      }))
    });

    await Promise.all(orderItemsData.map(async item => {
      const product = products.find(p => p.id === item.productId);
      if (product.stock < item.qty) {
        throw new Error(`Stok produk ${product.name} tidak cukup`);
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: product.stock - item.qty }
      });
    }));

    return newOrder;
  });

  return order;
};

export const getAllOrders = async () => {
  return await prisma.order.findMany({
    include: {
      OrderItem: {
        include: {
          Product: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export const getOrderById = async (id) => {
  return await prisma.order.findUnique({
    where: { id: Number(id) },
    include: {
      OrderItem: {
        include: {
          Product: true
        }
      }
    }
  });
};

export const getOrderSummary = async () => {
  const orders = await prisma.order.findMany({
    where: { status: 'paid' }
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    totalRevenue,
    totalOrders: orders.length
  };
};

export const updateOrderStatus = async (id, status) => {
  return await prisma.order.update({
    where: { id: Number(id) },
    data: { status, paidAt: status === 'paid' ? new Date() : null }
  });
};