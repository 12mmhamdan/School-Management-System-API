const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, required: true, enum: ['SUPERADMIN', 'SCHOOL_ADMIN'] },
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', default: null },
  },
  { timestamps: true }
);

// Avoid model overwrite in watch/hot reload scenarios
module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
