import * as productService from '../services/product.service.js';

const createProduct = async (req, res) => {
  try {
    const { name, price, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        message: 'Name dan price wajib diisi'
      });
    }

    const product = await productService.createProduct({
      name,
      price,
      image
    });

    res.status(201).json({
      message: 'Produk berhasil dibuat',
      data: product
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();

    res.json(products);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({
        message: 'Produk tidak ditemukan'
      });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, image } = req.body;

    if (!name || !price) {
      return res.status(400).json({
        message: 'Name dan price wajib diisi'
      });
    }

    const updatedProduct = await productService.updateProduct(id, {
      name,
      price,
      image
    });

    res.json({
      message: 'Produk berhasil diperbarui',
      data: updatedProduct
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);

    res.json({
      message: 'Produk berhasil dihapus'
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
}

export default {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct
};