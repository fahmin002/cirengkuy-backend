// ==============================================
// CirengKuy Backend — Entry Point
// ==============================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// import authRoutes from './src/routes/auth.routes.js';
import productRoutes from './src/routes/product.routes.js';
import orderRoutes from './src/routes/order.routes.js';
import paymentRoutes from './src/routes/payment.routes.js';
// import adminRoutes from './src/routes/admin.routes.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check ──
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    app: 'CirengKuy API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ──
// app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);
// app.use('/api/admin',    adminRoutes);

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Terjadi kesalahan pada server',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 CirengKuy API jalan di http://localhost:${PORT}`);
});