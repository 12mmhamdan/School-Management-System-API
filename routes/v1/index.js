const express = require('express');

const authJwt = require('./middlewares/authJwt');
const requireRole = require('./middlewares/requireRole');
const requireSchoolScope = require('./middlewares/requireSchoolScope');
const rateLimit = require('./middlewares/rateLimit');
const { validate, required, isEmail } = require('./validators');

/**
 * v1 REST API: School Management System
 */
module.exports = ({ config, managers }) => {
  const router = express.Router();

  // Global limiter for v1
  router.use(rateLimit({ windowSec: 60, max: 60, keyFn: (r) => `${r.ip}:v1` }));

  const wrap = (fn) => async (req, res) => {
    try {
      const out = await fn(req, res);
      return res.status(200).send({ ok: true, data: out });
    } catch (err) {
      const status = err.status || 500;
      const code = err.code || 'INTERNAL_ERROR';
      const message = err.message || 'Internal error';
      return res.status(status).send({ ok: false, error: { code, message } });
    }
  };

  // -------------------- AUTH --------------------

  // Bootstrapping endpoint: create the first superadmin
  router.post(
    '/auth/register-superadmin',
    rateLimit({ windowSec: 60, max: 5, keyFn: (r) => `${r.ip}:register-superadmin` }),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'email', errors);
        required(req.body, 'password', errors);
        if (req.body.email && !isEmail(req.body.email)) errors.push({ field: 'email', message: 'Invalid email' });
        if (req.body.password && String(req.body.password).length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
      }),
    wrap(async (req) => {
      return managers.smsAuth.registerSuperadmin({ email: req.body.email, password: req.body.password });
    })
  );

  router.post(
    '/auth/login',
    rateLimit({ windowSec: 60, max: 5, keyFn: (r) => `${r.ip}:login` }),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'email', errors);
        required(req.body, 'password', errors);
        if (req.body.email && !isEmail(req.body.email)) errors.push({ field: 'email', message: 'Invalid email' });
      }),
    wrap(async (req) => {
      return managers.smsAuth.login({ email: req.body.email, password: req.body.password });
    })
  );

  // Create a School Admin under a school (superadmin only)
  router.post(
    '/schools/:schoolId/admins',
    authJwt({ config }),
    requireRole(['SUPERADMIN']),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'email', errors);
        required(req.body, 'password', errors);
        if (req.body.email && !isEmail(req.body.email)) errors.push({ field: 'email', message: 'Invalid email' });
        if (req.body.password && String(req.body.password).length < 8) errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
      }),
    wrap(async (req) => {
      return managers.smsAuth.createSchoolAdmin({
        schoolId: req.params.schoolId,
        email: req.body.email,
        password: req.body.password,
        __authUser: req.auth,
      });
    })
  );

  // -------------------- SCHOOLS (superadmin) --------------------

  router.post(
    '/schools',
    authJwt({ config }),
    requireRole(['SUPERADMIN']),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'name', errors);
      }),
    wrap(async (req) => {
      return managers.smsSchools.createSchool({
        name: req.body.name,
        address: req.body.address,
        phone: req.body.phone,
        __authUser: req.auth,
      });
    })
  );

  router.get('/schools', authJwt({ config }), requireRole(['SUPERADMIN']), wrap(async (req) => {
    return managers.smsSchools.listSchools({ __authUser: req.auth, limit: req.query.limit, offset: req.query.offset });
  }));

  router.get('/schools/:id', authJwt({ config }), requireRole(['SUPERADMIN']), wrap(async (req) => {
    return managers.smsSchools.getSchool({ id: req.params.id, __authUser: req.auth });
  }));

  router.put('/schools/:id', authJwt({ config }), requireRole(['SUPERADMIN']), wrap(async (req) => {
    return managers.smsSchools.updateSchool({
      id: req.params.id,
      name: req.body.name,
      address: req.body.address,
      phone: req.body.phone,
      __authUser: req.auth,
    });
  }));

  router.delete('/schools/:id', authJwt({ config }), requireRole(['SUPERADMIN']), wrap(async (req) => {
    return managers.smsSchools.deleteSchool({ id: req.params.id, __authUser: req.auth });
  }));

  // -------------------- CLASSROOMS --------------------

  router.post(
    '/schools/:schoolId/classrooms',
    authJwt({ config }),
    requireSchoolScope(),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'name', errors);
        if (req.body.capacity !== undefined && Number.isNaN(Number(req.body.capacity))) {
          errors.push({ field: 'capacity', message: 'capacity must be a number' });
        }
      }),
    wrap(async (req) => {
      return managers.smsClassrooms.createClassroom({
        schoolId: req.params.schoolId,
        name: req.body.name,
        capacity: req.body.capacity,
        resources: req.body.resources,
        __authUser: req.auth,
      });
    })
  );

  router.get('/schools/:schoolId/classrooms', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsClassrooms.listClassrooms({
      schoolId: req.params.schoolId,
      limit: req.query.limit,
      offset: req.query.offset,
      __authUser: req.auth,
    });
  }));

  router.get('/schools/:schoolId/classrooms/:classroomId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsClassrooms.getClassroom({ schoolId: req.params.schoolId, classroomId: req.params.classroomId, __authUser: req.auth });
  }));

  router.put('/schools/:schoolId/classrooms/:classroomId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsClassrooms.updateClassroom({
      schoolId: req.params.schoolId,
      classroomId: req.params.classroomId,
      name: req.body.name,
      capacity: req.body.capacity,
      resources: req.body.resources,
      __authUser: req.auth,
    });
  }));

  router.delete('/schools/:schoolId/classrooms/:classroomId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsClassrooms.deleteClassroom({ schoolId: req.params.schoolId, classroomId: req.params.classroomId, __authUser: req.auth });
  }));

  // -------------------- STUDENTS --------------------

  router.post(
    '/schools/:schoolId/students',
    authJwt({ config }),
    requireSchoolScope(),
    (req, res, next) =>
      validate(req, res, next, (errors) => {
        required(req.body, 'firstName', errors);
        required(req.body, 'lastName', errors);
        required(req.body, 'studentNumber', errors);
      }),
    wrap(async (req) => {
      return managers.smsStudents.createStudent({
        schoolId: req.params.schoolId,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        dob: req.body.dob,
        studentNumber: req.body.studentNumber,
        classroomId: req.body.classroomId,
        __authUser: req.auth,
      });
    })
  );

  router.get('/schools/:schoolId/students', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsStudents.listStudents({
      schoolId: req.params.schoolId,
      limit: req.query.limit,
      offset: req.query.offset,
      q: req.query.q,
      __authUser: req.auth,
    });
  }));

  router.get('/schools/:schoolId/students/:studentId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsStudents.getStudent({ schoolId: req.params.schoolId, studentId: req.params.studentId, __authUser: req.auth });
  }));

  router.put('/schools/:schoolId/students/:studentId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsStudents.updateStudent({
      schoolId: req.params.schoolId,
      studentId: req.params.studentId,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      dob: req.body.dob,
      studentNumber: req.body.studentNumber,
      status: req.body.status,
      classroomId: req.body.classroomId,
      __authUser: req.auth,
    });
  }));

  router.delete('/schools/:schoolId/students/:studentId', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsStudents.deleteStudent({ schoolId: req.params.schoolId, studentId: req.params.studentId, __authUser: req.auth });
  }));

  router.post('/schools/:schoolId/students/:studentId/enroll', authJwt({ config }), requireSchoolScope(), wrap(async (req) => {
    return managers.smsStudents.enrollStudent({ schoolId: req.params.schoolId, studentId: req.params.studentId, classroomId: req.body.classroomId, __authUser: req.auth });
  }));

  router.post('/schools/:schoolId/students/:studentId/transfer', authJwt({ config }), requireRole(['SUPERADMIN']), wrap(async (req) => {
    return managers.smsStudents.transferStudent({
      schoolId: req.params.schoolId,
      studentId: req.params.studentId,
      toSchoolId: req.body.toSchoolId,
      toClassroomId: req.body.toClassroomId,
      __authUser: req.auth,
    });
  }));

  return router;
};
