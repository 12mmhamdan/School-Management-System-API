const School = require('./models/School.model');
const User = require('./models/User.model');

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

module.exports = class SmsSchoolManager {
  constructor() {}

  async createSchool({ name, address, phone, __authUser }) {
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');

    const school = await School.create({
      name,
      address: address || '',
      phone: phone || '',
      createdBy: __authUser.userId,
    });

    return this._toDto(school);
  }

  async listSchools({ __authUser, limit, offset }) {
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    limit = Math.min(parseInt(limit || 50, 10), 200);
    offset = Math.max(parseInt(offset || 0, 10), 0);
    const [items, total] = await Promise.all([
      School.find({}).sort({ createdAt: -1 }).skip(offset).limit(limit),
      School.countDocuments({}),
    ]);
    return { total, limit, offset, items: items.map((s) => this._toDto(s)) };
  }

  async getSchool({ id, __authUser }) {
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    const school = await School.findById(id);
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');
    return this._toDto(school);
  }

  async updateSchool({ id, name, address, phone, __authUser }) {
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    const school = await School.findById(id);
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');
    if (name !== undefined) school.name = name;
    if (address !== undefined) school.address = address;
    if (phone !== undefined) school.phone = phone;
    await school.save();
    return this._toDto(school);
  }

  async deleteSchool({ id, __authUser }) {
    if (__authUser.role !== 'SUPERADMIN') throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    const school = await School.findByIdAndDelete(id);
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');
    // Soft cleanup: unset schoolId for admins of this school
    await User.updateMany({ schoolId: id }, { $set: { schoolId: null } });
    return { deleted: true };
  }

  _toDto(s) {
    return {
      id: String(s._id),
      name: s.name,
      address: s.address || '',
      phone: s.phone || '',
      createdBy: String(s.createdBy),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  HttpError = HttpError;
};
