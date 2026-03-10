const request = require('supertest');
const app = require('../src/app');

describe('API Health Check', () => {
  it('should return status OK', async () => {
    const response = await request(app)
      .get('/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('message', 'Servidor funcionando');
  });
});

describe('User Routes', () => {
  it('should list users', async () => {
    const response = await request(app)
      .get('/api/users')
      .expect('Content-Type', /json/);

    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('data');
  });
});
