export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000'),
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
  },
  // URL nội bộ của từng service (trong Docker dùng container name, ngoài dùng localhost)
  services: {
    userService: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    productService: process.env.PRODUCT_SERVICE_URL || 'http://localhost:3002',
    orderService: process.env.ORDER_SERVICE_URL || 'http://localhost:3003',
    paymentService: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
  },
  rateLimit: {
    // Cửa sổ 15 phút (ms)
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    // Tổng request/IP trong cửa sổ
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '200'),
    // Giới hạn chặt hơn cho auth routes
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '20'),
  },
});
