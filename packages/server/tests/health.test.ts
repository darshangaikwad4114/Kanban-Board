import request from 'supertest';
import express from 'express';
import { errorHandler } from '../src/middleware/errorHandler';

const app = express();
app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});
app.use(errorHandler);

describe('Health Check', () => {
  it('should return 200 on health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/unknown');
    expect(res.status).toBe(404);
  });
});