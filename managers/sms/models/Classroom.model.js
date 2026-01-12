const mongoose = require('mongoose');

const ClassroomSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, default: 0, min: 0 },
    resources: { type: [String], default: [] },
  },
  { timestamps: true }
);

ClassroomSchema.index({ schoolId: 1, name: 1 }, { unique: true });

module.exports = mongoose.models.Classroom || mongoose.model('Classroom', ClassroomSchema);
