import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // =========================
  // 1. USERS
  // =========================
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cirengkuy.com' },
    update: {},
    create: {
      name: 'Admin Cirengkuy',
      email: 'admin@cirengkuy.com',
      password: 'hashedpassword', // nanti bisa pakai bcrypt
      role: 'admin',
      phone: '081234567890'
    }
  });

  const customer = await prisma.user.upsert({
    where: { email: 'user@cirengkuy.com' },
    update: {},
    create: {
      name: 'User Biasa',
      email: 'user@cirengkuy.com',
      password: 'hashedpassword',
      role: 'customer',
      phone: '081298765432'
    }
  });

  console.log('✅ Users seeded');

  // =========================
  // 2. PRODUCTS
  // =========================
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Cireng Original',
        price: 5000,
        stock: 100
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cireng Isi Ayam',
        price: 8000,
        stock: 100
      }
    }),
    prisma.product.create({
      data: {
        name: 'Cireng Pedas Level 5',
        price: 9000,
        stock: 100
      }
    })
  ]);

  console.log('✅ Products seeded');

  // =========================
  // 3. SAMPLE ORDER (CASH)
  // =========================
  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      total: 26000,
      status: 'paid',
      paymentMethod: 'cash',
      deliveryMethod: 'pickup',
      paidAt: new Date(),

      SubOrder: {
        create: [
          {
            name: 'Budi',
            note: 'tanpa saus',
            OrderItem: {
              create: [
                {
                  productId: products[0].id,
                  qty: 2,
                  price: 5000,
                  type: 'matang',
                  note: 'extra pedas'
                }
              ]
            }
          },
          {
            name: 'Andi',
            OrderItem: {
              create: [
                {
                  productId: products[1].id,
                  qty: 2,
                  price: 8000,
                  type: 'mentah'
                }
              ]
            }
          }
        ]
      },

      // 🔥 langsung isi OrderItem juga
      OrderItem: {
        create: [
          {
            productId: products[0].id,
            qty: 2,
            price: 5000,
            type: 'matang'
          },
          {
            productId: products[1].id,
            qty: 2,
            price: 8000,
            type: 'mentah'
          }
        ]
      }
    }
  });

  console.log('✅ Sample order seeded');

  console.log('🎉 SEEDING DONE!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });