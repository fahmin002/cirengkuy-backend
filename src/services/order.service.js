import e from "cors";
import prisma from "../config/db.js";
import { createTransaction } from "./midtrans.service.js";
import { parse, v4 as uuidv4 } from "uuid";
import { io } from "../../index.js";

const notifyOrderToAdmin = (order) => {
  io.to("admin-room").emit(
    "new-order",
    {
      code: order.code,
      customerName: order.customerName,
      total: order.total,
      status: order.status,
    }
  );
}

/* ---------------------------
 * 1. VALIDATION
 * --------------------------- */
function validatePayload(payload) {
  const {
    deliveryMethod,
    paymentMethod,
    address,
    customerName,
    customerPhone,
  } = payload;
  if (!["pickup", "delivery"].includes(deliveryMethod)) {
    throw new Error("deliveryMethod tidak valid");
  }

  if (!["cash", "qris"].includes(paymentMethod)) {
    throw new Error("paymentMethod tidak valid");
  }

  if (deliveryMethod === "delivery" && !address) {
    throw new Error("address wajib untuk delivery");
  }

  if (!customerName) {
    throw new Error("customerName wajib diisi");
  }
  // result
  // return true;
}

/* ---------------------------
 * 2. NORMALIZATION (dual mode)
 * --------------------------- */
function normalizePayload(payload) {
  const { subOrders, items } = payload;

  const hasSubOrders = Array.isArray(subOrders) && subOrders.length > 0;
  const hasItems = Array.isArray(items) && items.length > 0;

  if (!hasSubOrders && !hasItems) {
    throw new Error("payload harus memiliki items atau subOrders");
  }

  if (hasSubOrders) {
    return subOrders;
  }

  if (!hasSubOrders && hasItems) {
    // Wrap items ke dalam subOrder default
    return [
      {
        name: payload.customerName || "Pesanan Utama",
        note: null,
        items,
      },
    ];
  }
}

/* ---------------------------
 * 3. PREPARE ORDER DATA
 * --------------------------- */
async function prepareOrderData(tx, subOrders) {
  const ids = new Set();

  subOrders.forEach((so) => {
    if (!Array.isArray(so.items) || so.items.length === 0) {
      throw new Error(`SubOrder ${so.name || "-"} tidak punya item`);
    }

    so.items.forEach((i) => ids.add(i.productId));
  });

  const products = await tx.product.findMany({
    where: { id: { in: [...ids] } },
  });

  const map = new Map(products.map((p) => [p.id, p]));

  let total = 0;

  const draftItems = [];

  subOrders.forEach((so, idx) => {
    so.items.forEach((i) => {
      const product = map.get(i.productId);

      if (!product) throw new Error(`Produk ${i.productId} tidak ditemukan`);
      if (i.qty <= 0) throw new Error("Qty tidak valid");
      if (product.stock < i.qty) {
        throw new Error(`Stok tidak cukup untuk ${product.name}`);
      }

      const price = product.price;
      total += price * i.qty;

      draftItems.push({
        productId: product.id,
        qty: i.qty,
        price: price,
        type: i.type || "matang",
        note: i.note || null,
        subIdx: idx,
      });
    });
  });

  if (total <= 0) {
    throw new Error("Total order tidak boleh 0");
  }

  return { total, draftItems };
}

/* ---------------------------
 * 4. MAIN EXECUTION
 * --------------------------- */
export const createOrder = async (payload) => {
  validatePayload(payload);

  const subOrders = normalizePayload(payload);

  return await prisma.$transaction(async (tx) => {
    const { total, draftItems } = await prepareOrderData(tx, subOrders);
    const orderCode = uuidv4();
    const order = await tx.order.create({
      data: {
        customerName: payload.customerName,
        customerPhone: payload.customerPhone || null,
        code: orderCode,
        total,
        status: payload.paymentMethod === "cash" ? "paid" : "pending",
        paymentMethod: payload.paymentMethod,
        deliveryMethod: payload.deliveryMethod,

        // perlu diupdate setelah payment
        paymentUrl:
          payload.paymentMethod === "cash"
            ? `${process.env.FRONTEND_URL}/payment-success?orderCode=${orderCode}`
            : null,
        paymentExpiredAt: null,

        address: payload.deliveryMethod === "delivery" ? payload.address : null,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        note: payload.note || null,

        paidAt: payload.paymentMethod === "cash" ? new Date() : null,
      },
    });

    // create suborders
    const createdSubs = [];
    for (const so of subOrders) {
      const sub = await tx.subOrder.create({
        data: {
          orderId: order.id,
          name: so.name || payload.customerName,
          note: so.note || null,
        },
      });
      createdSubs.push(sub);
    }

    // create items + update stock
    for (const item of draftItems) {
      const sub = createdSubs[item.subIdx];

      await tx.orderItem.create({
        data: {
          orderId: order.id,
          subOrderId: sub.id,
          productId: item.productId,
          qty: item.qty,
          price: item.price,
          type: item.type,
          note: item.note,
        },
      });

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.qty },
        },
      });
    }

    // Payment integration (Midtrans)
    let paymentUrl = null;
    if (payload.paymentMethod === "qris") {
      const mid = await createTransaction(order, total);
      paymentUrl = mid;
      // Update paymentUrl and add paymentExpiredAt
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentUrl: mid,
          // 15 menit dari sekarang
          paymentExpiredAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });
    } else {
      paymentUrl = `${process.env.FRONTEND_URL}/payment-success?orderCode=${order.code}`;
    }

    notifyOrderToAdmin(order);

    return {
      orderId: order.id,
      total,
      paymentMethod: payload.paymentMethod,
      paymentUrl: paymentUrl,
    };
  });
};

export const getOrdersByPhone = async (phone, status, limit, skip) => {
  const where = {
      customerPhone: phone,
      ...(status
        ? { status }
        : {}
      ),
  }
  const orders = await prisma.order.findMany({
    where,
    include: {
      OrderItem: {
        include: {
          Product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    skip: skip
  });

  const total = await prisma.order.count({
    where
  });

  return { orders, total }
};

export const getAllOrders = async () => {
  return await prisma.order.findMany({
    include: {
      OrderItem: {
        include: {
          Product: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const getOrderByCode = async (code) => {
  return await prisma.order.findUnique({
    where: { code },
    include: {
      OrderItem: {
        include: {
          Product: true,
        },
      },
    },
  });
};

export const getOrderSummary = async () => {
  const orders = await prisma.order.findMany({
    where: { status: "paid" },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return {
    totalRevenue,
    totalOrders: orders.length,
  };
};

export const updatePaymentStatus = async (code, status) => {
  const paidAt = status === "paid" ? new Date() : null;
  return await prisma.order.update({
    where: { code: code },
    data: { status, paidAt },
  });
};

export const updateOrderStatus = async (code, status) => {
  io.to(`order-${code}`)
    .emit("order-status-updated", {
      status: status,
    });
  return await prisma.order.update({
    where: { code: code },
    data: { status },
  });
};

export const cancelOrder = async (orderId) => {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: Number(orderId) },
      include: {
        OrderItem: true,
      },
    });

    if (!order) {
      throw new Error("Order tidak ditemukan");
    }

    const cancellableStatuses = ["pending", "paid"];

    if (!cancellableStatuses.includes(order.status)) {
      throw new Error("Pesanan tidak bisa dibatalkan");
    }

    // restore stock
    for (const item of order.OrderItem) {
      await tx.product.update({
        where: {
          id: item.productId,
        },
        data: {
          stock: {
            increment: item.qty,
          },
        },
      });
    }

    // cancel order
    await tx.order.update({
      where: {
        id: Number(orderId),
      },
      data: {
        status: "cancelled",
      },
    });
  });
};

export const restockOrder = async (code) => {
  const order = await prisma.order.findUnique({
    where: { code },
    include: {
      OrderItem: true,
    },
  });

  if (!order) {
    throw new Error("Order tidak ditemukan");
  }

  for (const item of order.OrderItem) {
    await prisma.product.update({
      where: {
        id: item.productId,
      },
      data: {
        stock: {
          increment: item.qty,
        },
      },
    });
  }
};

export const getStats = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const revenueToday = await prisma.order.aggregate({
    _sum: {
      total: true,
    },
    where: {
      createdAt: {
        gte: today,
      },
      status: {
        not: "cancelled",
      },
    },
  });

  const totalOrdersToday = await prisma.order.count({
    where: {
      createdAt: {
        gte: today,
      },
      status: {
        not: "cancelled",
      },
    },
  });

  const pendingOrders = await prisma.order.count({
    where: {
      status: {
        in: ["pending", "paid", "cooking"],
      },
    },
  });

  const itemSold = await prisma.orderItem.aggregate({
    _sum: {
      qty: true,
    },
    where: {
      Order: {
        createdAt: {
          gte: today,
        },
        status: {
          not: "cancelled",
        },
      },
    },
  });

  return {
    revenueToday: revenueToday._sum.total || 0,
    totalOrdersToday,
    pendingOrders,
    itemSold: itemSold._sum.qty || 0,
  };
}

export const getRecentOrders = async (limit = 5) => {
  const recentOrders = await prisma.order.findMany({
    take: limit,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      customerName: true,
      total: true,
      status: true,
      createdAt: true,
    },
  });
  return recentOrders;
}