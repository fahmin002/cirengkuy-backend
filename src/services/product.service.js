import prisma from "../config/db.js";

export const createProduct = async (data) => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      price: Number(data.price),
      stock: Number(data.stock),
      isActive: data.isActive,
      imageUrl: data.imageUrl || null,
    },
  });
  return product;
};

export const getAllProducts = async () => {
  return await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
  });
};

export const getProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id: Number(id) },
  });
};

export const updateProduct = async (id, data) => {
  return await prisma.product.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      price: Number(data.price),
      isActive: data.isActive,
      imageUrl: data.imageUrl || null,
    },
  });
};

export const deleteProduct = async (id) => {
  return await prisma.product.delete({
    where: { id: Number(id) },
  });
};
