const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
require('dotenv').config();

const app = express();

const corsOptions = (req, callback) => {
  const origin = req.get('Origin');
  if (!origin) return callback(null, { origin: false });

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const sameOrigin = origin === `${req.protocol}://${req.get('host')}`;
  const localDevelopmentOrigin = process.env.NODE_ENV !== 'production'
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  callback(null, { origin: sameOrigin || allowedOrigins.includes(origin) || localDevelopmentOrigin });
};

// Middleware
app.use(express.json());
app.use(cors(corsOptions));

// Routes
// استدعاء مسارات المصادقة (Auth Routes)
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/requests', require('./routes/requestRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
// مسار اختباري بسيط للتأكد من عمل السيرفر
app.get('/', (req, res) => {
  res.send('Server is running smoothly!');
});

// Start Server
const PORT = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be configured before starting the server.');
  process.exit(1);
}

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});