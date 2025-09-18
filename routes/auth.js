// routes/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
const router = express.Router();

// Función para validar email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// -----------------------------
// Validar/Crear dispositivo
// -----------------------------
router.post("/device", async (req, res) => {
  try {
    const { email, deviceId } = req.body;

    // Validar que se enviaron los campos requeridos
    if (!email || !deviceId) {
      return res.status(400).json({ 
        ok: false, 
        message: "Email y deviceId son requeridos" 
      });
    }

    // Validar formato del email
    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        ok: false, 
        message: "El formato del email no es válido" 
      });
    }

    // Validar deviceId (mínimo 3 caracteres)
    if (deviceId.length < 3) {
      return res.status(400).json({ 
        ok: false, 
        message: "El deviceId debe tener al menos 3 caracteres" 
      });
    }

    // Buscar si ya existe un usuario con ese email y deviceId
    let user = await User.findOne({ email, deviceId });

    if (!user) {
      // Si no existe, crear uno nuevo
      user = new User({
        email,
        deviceId,
        createdAt: new Date()
      });

      await user.save();
      console.log(`Nuevo dispositivo creado: ${email} - ${deviceId}`);
    } else {
      console.log(`Dispositivo existente encontrado: ${email} - ${deviceId}`);
    }

    // Generar token con el userId y deviceId
    const token = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        deviceId: user.deviceId 
      },
      process.env.JWT_SECRET || "secreto",
      { expiresIn: "30d" } // Token de larga duración para dispositivos
    );

    res.json({
      ok: true,
      message: user.isNew ? "Dispositivo registrado exitosamente" : "Dispositivo validado",
      token,
      userId: user._id,
      deviceId: user.deviceId,
      email: user.email
    });

  } catch (error) {
    console.error("Error en validación de dispositivo:", error);
    res.status(500).json({ 
      ok: false, 
      message: "Error en el servidor" 
    });
  }
});

// -----------------------------
// Verificar token (middleware útil)
// -----------------------------
router.get("/verify", async (req, res) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ 
        ok: false, 
        message: "Token no proporcionado" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secreto");
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        ok: false, 
        message: "Token inválido" 
      });
    }

    res.json({
      ok: true,
      message: "Token válido",
      userId: user._id,
      email: user.email,
      deviceId: user.deviceId
    });

  } catch (error) {
    console.error("Error en verificación de token:", error);
    res.status(401).json({ 
      ok: false, 
      message: "Token inválido" 
    });
  }
});

export default router;