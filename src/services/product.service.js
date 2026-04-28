import prisma from '../config/db.js';

export const createProduct = async (data) => {
  const product = await prisma.product.create({
    data: {
      name: data.name,
      price: Number(data.price),
      image: data.image || null
    }
  });

  return product;
};

export const getAllProducts = async () => {
  return await prisma.product.findMany({
    orderBy: { createdAt: 'desc' }
  });
};

export const getProductById = async (id) => {
  return await prisma.product.findUnique({
    where: { id: Number(id) }
  });
}

export const updateProduct = async (id, data) => {
  return await prisma.product.update({
    where: { id: Number(id) },
    data: {
      name: data.name,
      price: Number(data.price),
      image: data.image || null
    }
  });
}

export const deleteProduct = async (id) => {
  return await prisma.product.delete({
    where: { id: Number(id) }
  });
}