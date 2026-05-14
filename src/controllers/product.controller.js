import * as productService from "../services/product.service.js";
import fs from "fs";

const createProduct = async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    let imageUrl = req.body.imageUrl; // untuk update tanpa ganti gambar

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    if (!name || !price || !stock) {
      return res.status(400).json({
        message: "Name, price, dan stock wajib diisi",
        success: false,
      });
    }

    const product = await productService.createProduct({
        name,
        price: Number(price),
        stock: Number(stock),
        imageUrl,
    });

    res.status(201).json({
      message: "Produk berhasil dibuat",
      data: product,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    
    res.json({
      data: products,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

const getActiveProducts = async (req, res) => {
  try {
    const products = await productService.getActiveProducts();
    res.json({
      data: products,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);

    if (!product) {
      return res.status(404).json({
        message: "Produk tidak ditemukan",
      });
    }

    res.json({
      data: product,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, isActive, stock } = req.body;
    let { imageUrl } = req.body;

    // Cek jika ada file gambar baru
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      // dihapus gambar lama
      const oldProduct = await productService.getProductById(id);
      if (oldProduct.imageUrl) {
        // lokasinya di root folder, jadi tambahkan . untuk mengaksesnya
        fs.unlink(`.${oldProduct.imageUrl}`, (err) => {
          if (err) console.error("Gagal menghapus gambar lama:", err);
        });
      }
    }

    if (!name || !price) {
      return res.status(400).json({
        message: "Name dan price wajib diisi",
      });
    }

    const updatedProduct = await productService.updateProduct(id, {
      name,
      price,
      stock,
      isActive: isActive === "true",
      imageUrl,
    });

    res.json({
      message: "Produk berhasil diperbarui",
      data: updatedProduct,
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);

    res.json({
      message: "Produk berhasil dihapus",
      success: true,
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
      success: false,
    });
  }
};

export default {
  createProduct,
  getAllProducts,
  getActiveProducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
