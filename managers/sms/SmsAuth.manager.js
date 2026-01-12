const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('./models/User.model');
const School = require('./models/School.model');

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code || 'ERROR';
  }
}

module.exports = class SmsAuthManager {
  constructor({ config }) {
    this.config = config;
  }

  _signToken(user) {
    const payload = {
      sub: String(user._id),
      role: user.role,
      schoolId: user.schoolId ? String(user.schoolId) : null,
    };
    return jwt.sign(payload, this.config.dotEnv.JWT_SECRET, {
      expiresIn: this.config.dotEnv.JWT_EXPIRES_IN || '1h',
    });
  }

  async registerSuperadmin({ email, password }) {
    // Allow creating the first SUPERADMIN for bootstrapping
    const existingSuperadmin = await User.findOne({ role: 'SUPERADMIN' }).lean();
    if (existingSuperadmin) {
      throw new HttpError(409, 'A superadmin already exists', 'SUPERADMIN_EXISTS');
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingEmail) {
      throw new HttpError(409, 'Email already in use', 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'SUPERADMIN',
      schoolId: null,
    });

    return { token: this._signToken(user), user: { id: String(user._id), email: user.email, role: user.role } };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials', 'INVALID_CREDENTIALS');

    return {
      token: this._signToken(user),
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        schoolId: user.schoolId ? String(user.schoolId) : null,
      },
    };
  }

  async createSchoolAdmin({ schoolId, email, password, __authUser }) {
    if (__authUser.role !== 'SUPERADMIN') {
      throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
    }
    const school = await School.findById(schoolId).lean();
    if (!school) throw new HttpError(404, 'School not found', 'NOT_FOUND');

    const existingEmail = await User.findOne({ email: email.toLowerCase() }).lean();
    if (existingEmail) throw new HttpError(409, 'Email already in use', 'EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      role: 'SCHOOL_ADMIN',
      schoolId,
    });

    return { id: String(user._id), email: user.email, role: user.role, schoolId: String(user.schoolId) };
  }

  HttpError = HttpError;
}
