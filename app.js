import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.js";
import positionRoutes from "./routes/position.js";

dotenv.config();

const app = express();

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:4000',
    'http://localhost:8080',
    // Agrega aquí otros dominios si es necesario
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Logging middleware
app.use(morgan('combined')); // Logs detallados para producción
// Para desarrollo puedes usar: app.use(morgan('dev'));

app.use(express.json({ limit: '10mb' })); // Límite de tamaño del body

// Custom logging middleware para requests importantes
app.use((req, res, next) => {
  const start = Date.now();
  
  // Log de request
  console.log(`📱 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Log de response cuando termine
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusEmoji = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusEmoji} [${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
    
    // Log especial para errores
    if (res.statusCode >= 400) {
      console.error(`🔍 Error details: ${req.method} ${req.url} - Body:`, req.body);
    }
  });
  
  next();
});

// Conexión a MongoDB con mejor logging
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => {
    console.log("🗄️  MongoDB conectado exitosamente");
    console.log(`📊 Database: ${mongoose.connection.name}`);
  })
  .catch(err => {
    console.error("❌ Error en MongoDB:", err);
    process.exit(1); // Salir si no se puede conectar a la DB
  });

// Mongoose connection events
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

// Rutas
app.use("/auth", authRoutes);
app.use("/api/position", positionRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'Server running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler

// Global error handler
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    ok: false,
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  process.exit(0);
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 CORS habilitado para desarrollo`);
});




/*
// 404 handler
app.use('*', (req, res) => {
  console.warn(`🔍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    ok: false,
    message: 'Endpoint not found',
    availableRoutes: [
      'POST /auth/device',
      'GET /auth/verify',
      'POST /position/',
      'GET /position/',
      'GET /health'
    ]
  });
});
*/