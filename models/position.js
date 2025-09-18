import mongoose from "mongoose";

const positionSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true,
    index: true 
  },
  deviceId: { 
    type: String, 
    required: true,
    index: true 
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  lat: { 
    type: Number, 
    required: true 
  },
  lng: { 
    type: Number, 
    required: true 
  },
  accuracy: { 
    type: Number, 
    default: null 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
});

// Índices compuestos para consultas eficientes
positionSchema.index({ email: 1, timestamp: -1 });
positionSchema.index({ deviceId: 1, timestamp: -1 });
positionSchema.index({ userId: 1, timestamp: -1 });

// Índice geoespacial si planeas hacer consultas por ubicación
positionSchema.index({ lat: 1, lng: 1 });

export default mongoose.model("Position", positionSchema);
