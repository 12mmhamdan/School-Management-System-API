const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', default: null },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    dob: { type: Date, default: null },
    studentNumber: { type: String, required: true, trim: true },
    status: { type: String, required: true, enum: ['ENROLLED', 'TRANSFERRED', 'INACTIVE'], default: 'ENROLLED' },
  },
  { timestamps: true }
);

StudentSchema.index({ schoolId: 1, studentNumber: 1 }, { unique: true });

module.exports = mongoose.models.Student || mongoose.model('Student', StudentSchema);
