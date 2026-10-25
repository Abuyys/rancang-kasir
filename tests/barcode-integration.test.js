const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/database');

describe('Barcode API Integration Tests', () => {
  let agent;

  beforeAll(async () => {
    agent = request.agent(app);

    // Login as admin
    const loginRes = await agent
      .post('/auth/login')
      .send({
        username: 'admin',
        password: 'admin123',
      });
    expect(loginRes.status).toBe(302); // Redirect to dashboard on login success
  });

  afterAll(async () => {
    if (app.sessionStore && typeof app.sessionStore.close === 'function') {
      try {
        await app.sessionStore.close();
      } catch (e) {}
    }
    await pool.end();
  });

  test('GET /api/products/barcode/:code returns 404 for unknown barcode', async () => {
    const res = await agent.get('/api/products/barcode/9999999999999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/barcode/render returns SVG barcode image', async () => {
    const res = await agent.get('/api/barcode/render?text=2000000000015&format=svg');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/svg+xml');
    const content = res.text || (res.body ? res.body.toString() : '');
    expect(content).toContain('<svg');
  });

  test('GET /api/barcode/next-internal returns valid next internal barcode', async () => {
    const res = await agent.get('/api/barcode/next-internal');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.barcode).toHaveLength(13);
    expect(res.body.data.barcode.startsWith('200')).toBe(true);
  });

  test('GET /labels/print renders label page', async () => {
    const res = await agent.get('/labels/print?size=38x25&copies=2');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Cetak Label Barcode');
    expect(res.text).toContain('size-38x25');
  });
});
