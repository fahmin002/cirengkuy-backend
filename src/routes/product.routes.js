import express from "express";
import productController from "../controllers/product.controller.js";
import { upload } from "../middleware/upload.middleware.js";
const router = express.Router();

// Admin
router.post("/", upload.single("image"), productController.createProduct);
router.put("/:id", upload.single("image"), productController.updateProduct);
router.delete("/:id", productController.deleteProduct);

// Public
router.get("/:id", productController.getProduct);

// Public
router.get("/", productController.getProducts);

export default router;
