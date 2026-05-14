import express from "express";
import productController from "../controllers/product.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
const router = express.Router();

// Admin
router.post("/", authenticate, upload.single("image"), productController.createProduct);
router.put("/:id", authenticate, upload.single("image"), productController.updateProduct);
router.delete("/:id", authenticate, productController.deleteProduct);
router.get("/", authenticate, productController.getAllProducts);
// Public
router.get("/client", productController.getActiveProducts);
router.get("/:id", productController.getProduct);

// Public

export default router;
