import prisma from "../config/db.js";
import { createTransaction } from './midtrans.service.js';
// export const createOrder = async (items, userId = null, paymentMethod = 'cash') => {
//   // 1. Ambil data produk berdasarkan productId dari items
//   const productIds = items.map(item => item.productId);
//   const products = await prisma.product.findMany({
//     where: { id: { in: productIds } }
//   });

//   // 2. Validasi apakah semua productId valid
//   if (products.length !== items.length) {
//     throw new Error('Salah satu produk tidak ditemukan');
//   }

//   // 3. Hitung total harga
//   let total = 0;
//   const orderItemsData = items.map(item => {
//     const product = products.find(p => p.id === item.productId);
//     const subTotal = product.price * item.qty;
//     total += subTotal;

//     return {
//       productId: item.productId,
//       qty: item.qty,
//       price: product.price
//     };
//   });
//   // 4. Buat order dan order items dalam transaksi
//   const order = await prisma.$transaction(async (tx) => {
//     const newOrder = await tx.order.create({
//       data: {
//         userId,
//         total,
//         status: paymentMethod === 'qris' ? 'pending' : 'paid',
//         paymentMethod,
//         paidAt: paymentMethod === 'qris' ? null : new Date()
//       }
//     });

//     await tx.orderItem.createMany({
//       data: orderItemsData.map(item => ({
//         ...item,
//         orderId: newOrder.id
//       }))
//     });

//     await Promise.all(orderItemsData.map(async item => {
//       const product = products.find(p => p.id === item.productId);
//       if (product.stock < item.qty) {
//         throw new Error(`Stok produk ${product.name} tidak cukup`);
//       }
//       await tx.product.update({
//         where: { id: item.productId },
//         data: { stock: product.stock - item.qty }
//       });
//     }));

//     return newOrder;
//   });

//   return order;
// };

/* ---------------------------
 * 1. VALIDATION
 * --------------------------- */
function validatePayload(payload) {
  const { deliveryMethod, paymentMethod, address, customerName, customerPhone } = payload;
  if (!['pickup', 'delivery'].includes(deliveryMethod)) {
    throw new Error('deliveryMethod tidak valid');
  }

  if (!['cash', 'qris'].includes(paymentMethod)) {
    throw new Error('paymentMethod tidak valid');
  }

  if (deliveryMethod === 'delivery' && !address) {
    throw new Error('address wajib untuk delivery');
  }

  if (!customerName) {
    throw new Error('customerName wajib diisi');
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
    throw new Error('payload harus memiliki items atau subOrders');
  }

  if (hasSubOrders) {
    return subOrders;
  }

  if (!hasSubOrders && hasItems) {
    // Wrap items ke dalam subOrder default
    return [{
      name: payload.customerName || 'Pesanan Utama',
      note: null,
      items
    }];
  }
}

/* ---------------------------
 * 3. PREPARE ORDER DATA
 * --------------------------- */
async function prepareOrderData(tx, subOrders) {
  const ids = new Set();

  subOrders.forEach(so => {
    if (!Array.isArray(so.items) || so.items.length === 0) {
      throw new Error(`SubOrder ${so.name || '-'} tidak punya item`);
    }

    so.items.forEach(i => ids.add(i.productId));
  });

  const products = await tx.product.findMany({
    where: { id: { in: [...ids] } }
  })

  const map = new Map(products.map(p => [p.id, p]));

  let total = 0;

  const draftItems = [];

  subOrders.forEach((so, idx) => {
    so.items.forEach(i => {
      const product = map.get(i.productId);

      if (!product) throw new Error(`Produk ${i.productId} tidak ditemukan`);
      if (i.qty <= 0) throw new Error('Qty tidak valid');
      if (product.stock < i.qty) {
        throw new Error(`Stok tidak cukup untuk ${product.name}`);
      }

      const price = product.price;
      total += price * i.qty;

      draftItems.push({
        productId: product.id,
        qty: i.qty,
        price: price,
        type: i.type || 'matang',
        note: i.note || null,
        subIdx: idx
      });
    });
  });

  if (total <= 0) {
    throw new Error('Total order tidak boleh 0');
  }

  return { total, draftItems };
}

/* ---------------------------
 * 4. MAIN EXECUTION
 * --------------------------- */
export const createOrder = async (payload, user = null) => {
  // Inject data dari user (kalau login)
  if (user) {
    payload.userId = user.id;
    payload.customerName = user.name;
    payload.customerPhone = user.phone;
  }

  validatePayload(payload);

  const subOrders = normalizePayload(payload);

  return await prisma.$transaction(async (tx) => {
    const { total, draftItems } = await prepareOrderData(tx, subOrders);

    const order = await tx.order.create({
      data: {
        userId: payload.userId || null,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone || null,

        total,
        status: payload.paymentMethod === 'cash' ? 'paid' : 'pending',
        paymentMethod: payload.paymentMethod,
        deliveryMethod: payload.deliveryMethod,

        address: payload.deliveryMethod === 'delivery' ? payload.address : null,
        scheduledAt: payload.scheduledAt ? new Date(payload.scheduledAt) : null,
        note: payload.note || null,

        paidAt: payload.paymentMethod === 'cash' ? new Date() : null,
      }
    });

    // create suborders
    const createdSubs = [];
    for (const so of subOrders) {
      const sub = await tx.subOrder.create({
        data: {
          orderId: order.id,
          name: so.name || payload.customerName,
          note: so.note || null
        }
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
          note: item.note
        }
      });

      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.qty }
        }
      });
    }

    // Payment integration (Midtrans)
    let paymentUrl = null;
    let token = null;
    if (payload.paymentMethod === 'qris') {
      const mid = await createTransaction(order, total);
      paymentUrl = mid;
    }

    return {
      orderId: order.id,
      total,
      paymentMethod: payload.paymentMethod,
      paymentUrl: paymentUrl,
    };
  });
}

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