import mongoose from "mongoose";

const userSchema = new mongoose.Schema({

  email: {
    type: String,
    required: true,
    required: false,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: false,
    minlength: 6,
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: false,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true
});


// Crear índice compuesto para email + deviceId (debe ser único la combinación)
userSchema.index({ email: 1, deviceId: 1 }, { unique: true });

// Middleware para actualizar lastActive
userSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

export default mongoose.model("User", userSchema);
