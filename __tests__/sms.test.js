const express = require('express');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const SmsAuthManager = require('../managers/sms/SmsAuth.manager');
const SmsSchoolManager = require('../managers/sms/SmsSchool.manager');
const SmsClassroomManager = require('../managers/sms/SmsClassroom.manager');
const SmsStudentManager = require('../managers/sms/SmsStudent.manager');
const v1RouterFactory = require('../routes/v1');

describe('School Management System API', () => {
  let mongo;
  let app;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName: 'test' });

    const config = {
      dotEnv: {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
      },
    };

    const managers = {
      smsAuth: new SmsAuthManager({ config }),
      smsSchools: new SmsSchoolManager({ config }),
      smsClassrooms: new SmsClassroomManager({ config }),
      smsStudents: new SmsStudentManager({ config }),
    };

    app = express();
    app.use(express.json());
    app.use('/v1', v1RouterFactory({ config, managers }));
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongo) await mongo.stop();
  });

  test('end-to-end: superadmin creates school, school-admin manages classrooms/students', async () => {
    // register first superadmin
    const reg = await request(app).post('/v1/auth/register-superadmin').send({ email: 'sa@example.com', password: 'password123' });
    expect(reg.status).toBe(200);
    expect(reg.body.ok).toBe(true);
    const saToken = reg.body.data.token;

    // create a school
    const schoolRes = await request(app)
      .post('/v1/schools')
      .set('Authorization', `Bearer ${saToken}`)
      .send({ name: 'My School', address: '123 St', phone: '555' });
    expect(schoolRes.status).toBe(200);
    const schoolId = schoolRes.body.data.id;

    // create school admin
    const adminRes = await request(app)
      .post(`/v1/schools/${schoolId}/admins`)
      .set('Authorization', `Bearer ${saToken}`)
      .send({ email: 'admin@example.com', password: 'password123' });
    expect(adminRes.status).toBe(200);

    // login as school admin
    const loginAdmin = await request(app).post('/v1/auth/login').send({ email: 'admin@example.com', password: 'password123' });
    expect(loginAdmin.status).toBe(200);
    const adminToken = loginAdmin.body.data.token;

    // create classroom
    const classroom = await request(app)
      .post(`/v1/schools/${schoolId}/classrooms`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Room A', capacity: 30, resources: ['Projector'] });
    expect(classroom.status).toBe(200);
    const classroomId = classroom.body.data.id;

    // enroll student
    const student = await request(app)
      .post(`/v1/schools/${schoolId}/students`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'Ada', lastName: 'Lovelace', studentNumber: 'S-001', classroomId });
    expect(student.status).toBe(200);

    // list students
    const list = await request(app)
      .get(`/v1/schools/${schoolId}/students`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.data.total).toBe(1);
  });
});
