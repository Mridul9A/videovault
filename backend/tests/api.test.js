const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Video = require('../models/Video');

// Use an in-memory or test DB
beforeAll(async () => {
  const uri = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/videovault_test';
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
});

// ─── Auth Tests ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      organisation: 'testorg',
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin'); // first in org
    expect(res.body.user.password).toBeUndefined();
  });

  it('rejects duplicate email', async () => {
    await User.create({ name: 'User', email: 'dup@example.com', password: 'pass123', organisation: 'org' });
    const res = await request(app).post('/api/auth/register').send({
      name: 'User2', email: 'dup@example.com', password: 'pass123',
    });
    expect(res.status).toBe(409);
  });

  it('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'User', email: 'notanemail', password: 'pass123',
    });
    expect(res.status).toBe(400);
  });

  it('rejects short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'User', email: 'ok@test.com', password: 'abc',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  let user;
  beforeEach(async () => {
    user = await User.create({ name: 'Test', email: 'login@test.com', password: 'password123', organisation: 'org' });
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com', password: 'password123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com', password: 'wrongpass',
    });
    expect(res.status).toBe(401);
  });

  it('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'password123',
    });
    expect(res.status).toBe(401);
  });
});

// ─── Auth Middleware Tests ────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns user when authenticated', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Me', email: 'me@test.com', password: 'pass123', organisation: 'org2',
    });
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Video Tests ──────────────────────────────────────────────────
describe('GET /api/videos', () => {
  let token, userId;

  beforeEach(async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'Editor', email: 'editor@test.com', password: 'pass123', organisation: 'vidorg',
    });
    token = reg.body.token;
    userId = reg.body.user._id;
  });

  it('returns empty list for new user', async () => {
    const res = await request(app)
      .get('/api/videos')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.videos).toHaveLength(0);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/videos');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/videos/stats', () => {
  it('returns stats object', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'StatsUser', email: 'stats@test.com', password: 'pass123', organisation: 'statsorg',
    });
    const res = await request(app)
      .get('/api/videos/stats')
      .set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.stats).toHaveProperty('total');
    expect(res.body.stats).toHaveProperty('safe');
    expect(res.body.stats).toHaveProperty('flagged');
  });
});

// ─── RBAC Tests ───────────────────────────────────────────────────
describe('Role-based access', () => {
  it('viewer cannot access upload route', async () => {
    // Create admin first to set up org
    await request(app).post('/api/auth/register').send({
      name: 'Admin', email: 'admin@rbac.com', password: 'pass123', organisation: 'rbacorg',
    });
    // Register viewer
    const viewerReg = await request(app).post('/api/auth/register').send({
      name: 'Viewer', email: 'viewer@rbac.com', password: 'pass123', organisation: 'rbacorg',
    });
    // Manually set role to viewer
    await User.findByIdAndUpdate(viewerReg.body.user._id, { role: 'viewer' });
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'viewer@rbac.com', password: 'pass123',
    });

    const res = await request(app)
      .post('/api/videos/upload')
      .set('Authorization', `Bearer ${loginRes.body.token}`)
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── Health Check ─────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
