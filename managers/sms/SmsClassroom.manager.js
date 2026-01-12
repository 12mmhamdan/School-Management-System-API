const Classroom = require('./models/Classroom.model');
const School = require('./models/School.model');

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

module.exports = class SmsClassroomManager {
  constructor() {}

  _assertScope({ schoolId, __authUser }) {
    if (__authUser.role === 'SUPERADMIN') return;
    if (__authUser.role !== 'SCHOOL_ADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    if (!__authUser.schoolId || String(__authUser.schoolId) !== String(schoolId)) {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
  }

  async createClassroom({ schoolId, name, capacity, resources, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const school = await School.findById(schoolId).lean();
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');

    try {
      const classroom = await Classroom.create({
        schoolId,
        name,
        capacity: capacity ?? 0,
        resources: resources || [],
      });
      return this._toDto(classroom);
    } catch (err) {
      if (err && err.code === 11000) {
        throw new HttpError(409, 'Classroom name already exists for this school', 'DUPLICATE');
      }
      throw err;
    }
  }

  async listClassrooms({ schoolId, __authUser, limit, offset }) {
    this._assertScope({ schoolId, __authUser });
    limit = Math.min(parseInt(limit || 50, 10), 200);
    offset = Math.max(parseInt(offset || 0, 10), 0);
    const [items, total] = await Promise.all([
      Classroom.find({ schoolId }).sort({ createdAt: -1 }).skip(offset).limit(limit),
      Classroom.countDocuments({ schoolId }),
    ]);
    return { total, limit, offset, items: items.map((c) => this._toDto(c)) };
  }

  async getClassroom({ schoolId, classroomId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const classroom = await Classroom.findOne({ _id: classroomId, schoolId });
    if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');
    return this._toDto(classroom);
  }

  async updateClassroom({ schoolId, classroomId, name, capacity, resources, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const classroom = await Classroom.findOne({ _id: classroomId, schoolId });
    if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');

    if (name !== undefined) classroom.name = name;
    if (capacity !== undefined) classroom.capacity = capacity;
    if (resources !== undefined) classroom.resources = resources;

    try {
      await classroom.save();
    } catch (err) {
      if (err && err.code === 11000) {
        throw new HttpError(409, 'Classroom name already exists for this school', 'DUPLICATE');
      }
      throw err;
    }
    return this._toDto(classroom);
  }

  async deleteClassroom({ schoolId, classroomId, __authUser }) {
    this._assertScope({ schoolId, __authUser });
    const classroom = await Classroom.findOneAndDelete({ _id: classroomId, schoolId });
    if (!classroom) throw new HttpError(404, 'Classroom not found', 'NOT_FOUND');
    return { deleted: true };
  }

  _toDto(c) {
    return {
      id: String(c._id),
      schoolId: String(c.schoolId),
      name: c.name,
      capacity: c.capacity,
      resources: c.resources || [],
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  HttpError = HttpError;
};
