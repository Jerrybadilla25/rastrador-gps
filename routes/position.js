import express from "express";
import Position from "../models/position.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware de autenticación
const authMiddleware = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ ok: false, message: "Token requerido" });

  jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET || "secreto", (err, decoded) => {
    if (err) return res.status(401).json({ ok: false, message: "Token inválido" });
    req.user = decoded; // decoded contendrá { userId, email, deviceId }
    next();
  });
};

// Guardar posición
router.post("/", authMiddleware, async (req, res) => {
  console.log(req.body);
  try {
    const { lat, lng, accuracy, timestamp } = req.body;
    
    // Validar datos requeridos
    if (!lat || !lng) {
      return res.status(400).json({ 
        ok: false, 
        message: "Latitud y longitud son requeridas" 
      });
    }

    // Crear nueva posición con datos del token
    const position = new Position({ 
      email: req.user.email,
      deviceId: req.user.deviceId,
      userId: req.user.userId,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      accuracy: accuracy ? parseFloat(accuracy) : null,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });

    await position.save();
    
    res.json({ 
      ok: true, 
      message: "Posición guardada exitosamente",
      position: {
        id: position._id,
        lat: position.lat,
        lng: position.lng,
        timestamp: position.timestamp
      }
    });

  } catch (error) {
    console.error("Error al guardar posición:", error);
    res.status(500).json({ 
      ok: false, 
      message: "Error al guardar la posición" 
    });
  }
});

// Consultar posiciones por email
router.get("/by-email/:email", authMiddleware, async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    // Solo permitir consultar las propias posiciones o ser admin
    if (req.user.email !== email) {
      return res.status(403).json({ 
        ok: false, 
        message: "No autorizado para consultar estas posiciones" 
      });
    }

    const positions = await Position.find({ email })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    res.json({ 
      ok: true, 
      positions,
      count: positions.length 
    });

  } catch (error) {
    console.error("Error al consultar posiciones:", error);
    res.status(500).json({ 
      ok: false, 
      message: "Error al consultar posiciones" 
    });
  }
});

// Consultar posiciones por deviceId
router.get("/by-device/:deviceId", authMiddleware, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { limit = 100, page = 1 } = req.query;
    
    // Solo permitir consultar las posiciones del propio dispositivo
    if (req.user.deviceId !== deviceId) {
      return res.status(403).json({ 
        ok: false, 
        message: "No autorizado para consultar estas posiciones" 
      });
    }

    const positions = await Position.find({ deviceId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    res.json({ 
      ok: true, 
      positions,
      count: positions.length 
    });

  } catch (error) {
    console.error("Error al consultar posiciones:", error);
    res.status(500).json({ 
      ok: false, 
      message: "Error al consultar posiciones" 
    });
  }
});

// Consultar posiciones del usuario autenticado (más simple)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { limit = 100, page = 1 } = req.query;

    const positions = await Position.find({ 
      email: req.user.email,
      deviceId: req.user.deviceId 
    })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    res.json({ 
      ok: true, 
      positions,
      count: positions.length 
    });

  } catch (error) {
    console.error("Error al consultar posiciones:", error);
    res.status(500).json({ 
      ok: false, 
      message: "Error al consultar posiciones" 
    });
  }
});

export default router;