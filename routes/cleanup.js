import express from "express";
import Position from "../models/position.js";
import { cleanOldPositions } from "../app.js";

const router = express.Router();

// ========================================
// 🗑️ LIMPIEZA MANUAL (ejecutar limpieza ahora)
// ========================================
router.post("/", async (req, res) => {
  try {
    console.log('🔧 Limpieza manual solicitada');
    
    const result = await cleanOldPositions();
    
    res.json({
      ok: true,
      message: 'Limpieza ejecutada exitosamente',
      data: {
        deletedCount: result.deletedCount,
        totalPositions: result.totalPositions,
        oldestPosition: result.oldestPosition,
        newestPosition: result.newestPosition
      }
    });
    
  } catch (error) {
    console.error('❌ Error en limpieza manual:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al ejecutar limpieza',
      error: error.message
    });
  }
});

// ========================================
// 📊 ESTADÍSTICAS DE POSICIONES
// ========================================
router.get("/stats", async (req, res) => {
  try {
    const totalPositions = await Position.countDocuments();
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const oldPositions = await Position.countDocuments({
      timestamp: { $lt: sevenDaysAgo }
    });
    
    const oldestPosition = await Position.findOne().sort({ timestamp: 1 });
    const newestPosition = await Position.findOne().sort({ timestamp: -1 });
    
    // Posiciones por dispositivo
    const positionsByDevice = await Position.aggregate([
      {
        $group: {
          _id: "$deviceId",
          count: { $sum: 1 },
          oldestTimestamp: { $min: "$timestamp" },
          newestTimestamp: { $max: "$timestamp" }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      ok: true,
      stats: {
        totalPositions,
        oldPositionsCount: oldPositions,
        oldestPosition: oldestPosition?.timestamp,
        newestPosition: newestPosition?.timestamp,
        deviceCount: positionsByDevice.length,
        positionsByDevice: positionsByDevice.slice(0, 10) // Top 10 dispositivos
      }
    });
    
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al obtener estadísticas',
      error: error.message
    });
  }
});

// ========================================
// 🗑️ LIMPIAR POSICIONES DE UN DISPOSITIVO ESPECÍFICO
// ========================================
router.delete("/device/:deviceId", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { days = 7 } = req.query; // Días de antigüedad (default 7)
    
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - parseInt(days));
    
    const result = await Position.deleteMany({
      deviceId: deviceId,
      timestamp: { $lt: daysAgo }
    });
    
    console.log(`🗑️ Eliminadas ${result.deletedCount} posiciones del dispositivo ${deviceId}`);
    
    res.json({
      ok: true,
      message: `Posiciones antiguas del dispositivo ${deviceId} eliminadas`,
      deletedCount: result.deletedCount,
      cutoffDate: daysAgo
    });
    
  } catch (error) {
    console.error('❌ Error eliminando posiciones del dispositivo:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al eliminar posiciones del dispositivo',
      error: error.message
    });
  }
});

// ========================================
// 🗑️ LIMPIAR TODAS LAS POSICIONES (¡CUIDADO!)
// ========================================
router.delete("/all", async (req, res) => {
  try {
    // Verificar confirmación
    const { confirm } = req.query;
    
    if (confirm !== "YES_DELETE_ALL") {
      return res.status(400).json({
        ok: false,
        message: 'Se requiere confirmación. Agregar ?confirm=YES_DELETE_ALL'
      });
    }
    
    const result = await Position.deleteMany({});
    
    console.log(`⚠️ TODAS LAS POSICIONES ELIMINADAS: ${result.deletedCount}`);
    
    res.json({
      ok: true,
      message: 'Todas las posiciones han sido eliminadas',
      deletedCount: result.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Error eliminando todas las posiciones:', error);
    res.status(500).json({
      ok: false,
      message: 'Error al eliminar todas las posiciones',
      error: error.message
    });
  }
});

export default router;