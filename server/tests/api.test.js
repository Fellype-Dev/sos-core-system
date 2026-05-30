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

describe('API Root', () => {
  it('should return api root metadata', async () => {
    const response = await request(app)
      .get('/api')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('message', 'API SOS Core System');
    expect(response.body).toHaveProperty('version', '1.0.0');
  });
});
