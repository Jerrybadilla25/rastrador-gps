import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true 
  },
  deviceId: { 
    type: String, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastActive: { 
    type: Date, 
    default: Date.now 
  }
});

// Crear índice compuesto para email + deviceId (debe ser único la combinación)
userSchema.index({ email: 1, deviceId: 1 }, { unique: true });

// Middleware para actualizar lastActive
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

export default mongoose.model("User", userSchema);
