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

// Función para generar tokens
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { 
      userId: user._id,
      email: user.email,
      deviceId: user.deviceId 
    },
    process.env.JWT_SECRET || "secreto",
    { expiresIn: "15m" } // Token corto para seguridad
  );

  const refreshToken = jwt.sign(
    { 
      userId: user._id,
      type: 'refresh',
      deviceId: user.deviceId
    },
    process.env.JWT_REFRESH_SECRET || "refresh_secreto",
    { expiresIn: "30d" } // Token largo para renovación
  );

  return { accessToken, refreshToken };
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
    let isNewUser = false;

    if (!user) {
      // Si no existe, crear uno nuevo
      user = new User({
        email,
        deviceId,
        createdAt: new Date()
      });

      await user.save();
      isNewUser = true;
      console.log(`Nuevo dispositivo creado: ${email} - ${deviceId}`);
    } else {
      console.log(`Dispositivo existente encontrado: ${email} - ${deviceId}`);
    }

    // Generar ambos tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Opcional: Guardar el refresh token en la base de datos (hasheado)
    // user.refreshToken = await bcrypt.hash(refreshToken, 10);
    // await user.save();

    res.json({
      ok: true,
      message: isNewUser ? "Dispositivo registrado exitosamente" : "Dispositivo validado",
      accessToken,
      refreshToken,
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
// Renovar access token
// -----------------------------
router.post("/refresh-token", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ 
        ok: false, 
        message: "Refresh token requerido" 
      });
    }

    // Verificar el refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secreto");
    
    // Validar que es un refresh token
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ 
        ok: false, 
        message: "Token inválido" 
      });
    }

    // Buscar el usuario
    const user = await User.findById(decoded.userId);
    if (!user || user.deviceId !== decoded.deviceId) {
      return res.status(401).json({ 
        ok: false, 
        message: "Usuario no encontrado o dispositivo inválido" 
      });
    }

    // Opcional: Verificar si el refresh token está en la base de datos
    // const isValidRefresh = await bcrypt.compare(refreshToken, user.refreshToken);
    // if (!isValidRefresh) {
    //   return res.status(401).json({ ok: false, message: "Refresh token inválido" });
    // }

    // Generar nuevo access token
    const newAccessToken = jwt.sign(
      { 
        userId: user._id,
        email: user.email,
        deviceId: user.deviceId 
      },
      process.env.JWT_SECRET || "secreto",
      { expiresIn: "15m" }
    );

    res.json({
      ok: true,
      accessToken: newAccessToken,
      message: "Token renovado exitosamente"
    });

  } catch (error) {
    console.error("Error renovando token:", error);
    
    // Diferentes tipos de errores JWT
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        ok: false, 
        message: "Refresh token expirado" 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        ok: false, 
        message: "Refresh token inválido" 
      });
    }

    res.status(500).json({ 
      ok: false, 
      message: "Error en el servidor" 
    });
  }
});

// -----------------------------
// Verificar token (actualizada para access token)
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
    
    // Verificar que no sea un refresh token
    if (decoded.type === 'refresh') {
      return res.status(401).json({ 
        ok: false, 
        message: "Token inválido - use access token" 
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.deviceId !== decoded.deviceId) {
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
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        ok: false, 
        message: "Token expirado" 
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        ok: false, 
        message: "Token inválido" 
      });
    }

    res.status(401).json({ 
      ok: false, 
      message: "Token inválido" 
    });
  }
});

// -----------------------------
// Logout (invalidar refresh token)
// -----------------------------
router.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secreto");
      
      // Si guardas refresh tokens en BD, elimínalo aquí
      // await User.findByIdAndUpdate(decoded.userId, { refreshToken: null });
      
      console.log(`Usuario ${decoded.userId} cerró sesión`);
    }

    res.json({
      ok: true,
      message: "Logout exitoso"
    });

  } catch (error) {
    // Aunque el token sea inválido, devolver éxito para el logout
    res.json({
      ok: true,
      message: "Logout exitoso"
    });
  }
});

export default router;