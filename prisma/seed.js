import prisma from '../src/config/db.js';
// Reference
// model Product {
//   id        Int      @id @default(autoincrement())
//   name      String
//   price     Int
//   image     String?

//   stock     Int      @default(0)

//   createdAt DateTime @default(now())

//   OrderItem OrderItem[]
// }
async function main() {
  await prisma.product.createMany({
    data: [
      { name: "Cireng Ayam Original", price: 1000, stock: 100 },
      { name: "Cireng Ayam Pedas", price: 1000, stock: 100 },
      { name: "Cireng Mozarella", price: 1000, stock: 100 },
      { name: "Cireng BBQ", price: 1500, stock: 100 }
    ]
  });

  console.log("🔥 Produk berhasil di-seed");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());