const Student = require('./models/Student.model');
const School = require('./models/School.model');
const Classroom = require('./models/Classroom.model');

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

module.exports = class SmsStudentManager {
  constructor() {}

  _assertScope({ schoolId, __authUser }) {
    if (__authUser.role === 'SUPERADMIN') return;
    if (__authUser.role !== 'SCHOOL_ADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    if (!__authUser.schoolId || String(__authUser.schoolId) !== String(schoolId)) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
  }

  async createStudent({ schoolId, firstName, lastName, dob, studentNumber, classroomId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const school = await School.findById(schoolId).lean();
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');

    if (classroomId) {
      const classroom = await Classroom.findOne({ _id: classroomId, schoolId }).lean();
      if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');
    }

    try {
      const student = await Student.create({
        schoolId,
        classroomId: classroomId || null,
        firstName,
        lastName,
        dob: dob ? new Date(dob) : null,
        studentNumber,
        status: 'ENROLLED',
      });
      return this._toDto(student);
    } catch (err) {
      if (err && err.code === 11000) {
        throw new HttpError(409, 'studentNumber already exists for this school', 'DUPLICATE');
      }
      throw err;
    }
  }

  async listStudents({ schoolId, __authUser, limit, offset, q }) {
    this._assertScope({ schoolId, __authUser });
    limit = Math.min(parseInt(limit || 50, 10), 200);
    offset = Math.max(parseInt(offset || 0, 10), 0);

    const filter = { schoolId };
    if (q) {
      filter.$or = [
        { firstName: { $regex: q, $options: 'i' } },
        { lastName: { $regex: q, $options: 'i' } },
        { studentNumber: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Student.countDocuments(filter),
    ]);
    return { total, limit, offset, items: items.map((s) => this._toDto(s)) };
  }

  async getStudent({ schoolId, studentId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) throw new HttpError(404, 'Student not found', 'NOT_FOUND');
    return this._toDto(student);
  }

  async updateStudent({ schoolId, studentId, firstName, lastName, dob, studentNumber, status, classroomId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) throw new HttpError(404, 'Student not found', 'NOT_FOUND');

    if (classroomId !== undefined) {
      if (classroomId === null || classroomId === '') {
        student.classroomId = null;
      } else {
        const classroom = await Classroom.findOne({ _id: classroomId, schoolId }).lean();
        if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');
        student.classroomId = classroomId;
      }
    }

    if (firstName !== undefined) student.firstName = firstName;
    if (lastName !== undefined) student.lastName = lastName;
    if (dob !== undefined) student.dob = dob ? new Date(dob) : null;
    if (studentNumber !== undefined) student.studentNumber = studentNumber;
    if (status !== undefined) student.status = status;

    try {
      await student.save();
    } catch (err) {
      if (err && err.code === 11000) {
        throw new HttpError(409, 'studentNumber already exists for this school', 'DUPLICATE');
      }
      throw err;
    }

    return this._toDto(student);
  }

  async deleteStudent({ schoolId, studentId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const student = await Student.findOneAndDelete({ _id: studentId, schoolId });
    if (!student) throw new HttpError(404, 'Student not found', 'NOT_FOUND');
    return { deleted: true };
  }

  async enrollStudent({ schoolId, studentId, classroomId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) throw new HttpError(404, 'Student not found', 'NOT_FOUND');
    if (classroomId) {
      const classroom = await Classroom.findOne({ _id: classroomId, schoolId }).lean();
      if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');
      student.classroomId = classroomId;
    } else {
      student.classroomId = null;
    }
    student.status = 'ENROLLED';
    await student.save();
    return this._toDto(student);
  }

  async transferStudent({ schoolId, studentId, toSchoolId, toClassroomId, __authUser }) {
    // Assumption: cross-school transfers are SUPERADMIN only
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');

    const student = await Student.findOne({ _id: studentId, schoolId });
    if (!student) throw new HttpError(404, 'Student not found', 'NOT_FOUND');

    const toSchool = await School.findById(toSchoolId).lean();
    if (!toSchool) throw new HttpError(404, 'Destination school not found', 'NOT_FOUND');

    if (toClassroomId) {
      const toClassroom = await Classroom.findOne({ _id: toClassroomId, schoolId: toSchoolId }).lean();
      if (!toClassroom) throw new HttpError(404, 'Destination classroom not found', 'NOT_FOUND');
      student.classroomId = toClassroomId;
    } else {
      student.classroomId = null;
    }

    student.schoolId = toSchoolId;
    student.status = 'TRANSFERRED';

    try {
      await student.save();
    } catch (err) {
      if (err && err.code === 11000) {
        throw new HttpError(409, 'studentNumber already exists for destination school', 'DUPLICATE');
      }
      throw err;
    }

    return this._toDto(student);
  }

  _toDto(s) {
    return {
      id: String(s._id),
      schoolId: String(s.schoolId),
      classroomId: s.classroomId ? String(s.classroomId) : null,
      firstName: s.firstName,
      lastName: s.lastName,
      dob: s.dob,
      studentNumber: s.studentNumber,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  HttpError = HttpError;
};
