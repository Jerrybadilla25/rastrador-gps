import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cron from "node-cron";

import authRoutes from "./routes/auth.js";
import positionRoutes from "./routes/position.js";
import cleanupRoutes from "./routes/cleanup.js";
import Position from "./models/position.js";

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

// ========================================
// 🗑️ FUNCIÓN DE LIMPIEZA AUTOMÁTICA
// ========================================
async function cleanOldPositions() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    console.log(`🧹 [${new Date().toISOString()}] Iniciando limpieza de posiciones antiguas...`);
    console.log(`📅 Eliminando posiciones anteriores a: ${sevenDaysAgo.toISOString()}`);
    
    const result = await Position.deleteMany({
      timestamp: { $lt: sevenDaysAgo }
    });
    
    if (result.deletedCount > 0) {
      console.log(`✅ Limpieza completada: ${result.deletedCount} posiciones eliminadas`);
    } else {
      console.log(`ℹ️  No hay posiciones antiguas para eliminar`);
    }
    
    // Mostrar estadísticas actuales
    const totalPositions = await Position.countDocuments();
    const oldestPosition = await Position.findOne().sort({ timestamp: 1 });
    const newestPosition = await Position.findOne().sort({ timestamp: -1 });
    
    console.log(`📊 Estadísticas actuales:`);
    console.log(`   - Total de posiciones: ${totalPositions}`);
    if (oldestPosition) {
      console.log(`   - Posición más antigua: ${oldestPosition.timestamp.toISOString()}`);
    }
    if (newestPosition) {
      console.log(`   - Posición más reciente: ${newestPosition.timestamp.toISOString()}`);
    }
    
    return {
      deletedCount: result.deletedCount,
      totalPositions,
      oldestPosition: oldestPosition?.timestamp,
      newestPosition: newestPosition?.timestamp
    };
    
  } catch (error) {
    console.error('❌ Error en limpieza automática:', error);
    throw error;
  }
}

// Exportar la función para usarla en las rutas
export { cleanOldPositions };

// ========================================
// 📅 CONFIGURAR CRON JOB
// ========================================
// Ejecutar todos los días a las 3:00 AM
cron.schedule('0 3 * * *', () => {
  console.log('⏰ Cron job activado: Ejecutando limpieza programada');
  cleanOldPositions();
}, {
  timezone: "America/Costa_Rica" // Ajusta según tu zona horaria
});

console.log('⏰ Cron job configurado: Limpieza diaria a las 3:00 AM (America/Costa_Rica)');

// Conexión a MongoDB con mejor logging
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
  .then(() => {
    console.log("🗄️  MongoDB conectado exitosamente");
    console.log(`📊 Database: ${mongoose.connection.name}`);
    
    // Ejecutar limpieza inicial al iniciar el servidor
    console.log('🚀 Ejecutando limpieza inicial...');
    cleanOldPositions();
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
app.use("/api/cleanup", cleanupRoutes); // 🗑️ Rutas de limpieza manual

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'Server running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

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