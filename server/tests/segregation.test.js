// Testes da segregação de dados entre unidades (programas) — o requisito de
// privacidade mais crítico do sistema. Cobrem a lógica de autorização sem
// depender do Supabase (os caminhos exercitados retornam antes de tocar o banco).

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const StudentController = require('../src/controllers/StudentController');
const AttendanceController = require('../src/controllers/AttendanceController');
const { resolveScopedProgramId, isUuid } = require('../src/utils/programContext');

const UUID_A = '11111111-1111-1111-1111-111111111111';
const UUID_B = '22222222-2222-2222-2222-222222222222';

function tokenFor(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '5m' });
}

describe('programContext.resolveScopedProgramId', () => {
  it('coordenador usa apenas o programa do JWT, ignorando query e body', () => {
    const req = {
      userRole: 'coordenador',
      selectedProgramId: UUID_A,
      query: { program_id: UUID_B },
      body: { program_id: UUID_B },
    };
    expect(resolveScopedProgramId(req)).toBe(UUID_A);
  });

  it('coordenador sem unidade no JWT retorna null mesmo com query preenchida', () => {
    const req = {
      userRole: 'coordenador',
      selectedProgramId: null,
      query: { program_id: UUID_B },
      body: {},
    };
    expect(resolveScopedProgramId(req)).toBeNull();
  });

  it('admin pode priorizar a unidade vinda da query (troca de unidade na UI)', () => {
    const req = {
      userRole: 'admin',
      selectedProgramId: UUID_A,
      query: { program_id: UUID_B },
      body: {},
    };
    expect(resolveScopedProgramId(req)).toBe(UUID_B);
  });

  it('admin cai para o JWT quando nao ha query nem body', () => {
    const req = { userRole: 'admin', selectedProgramId: UUID_A, query: {}, body: {} };
    expect(resolveScopedProgramId(req)).toBe(UUID_A);
  });
});

describe('programContext.isUuid', () => {
  it('aceita UUID valido', () => {
    expect(isUuid(UUID_A)).toBe(true);
  });

  it('rejeita valores que nao sao UUID', () => {
    expect(isUuid('nao-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(123)).toBe(false);
  });
});

describe('validateProgramAccess (segregação por unidade)', () => {
  const controllers = [
    ['StudentController', StudentController],
    ['AttendanceController', AttendanceController],
  ];

  it.each(controllers)('%s: nega quando nenhuma unidade foi informada', (_name, controller) => {
    const result = controller.validateProgramAccess(
      { userRole: 'coordenador', allowedProgramIds: [UUID_A] },
      null
    );
    expect(result.ok).toBe(false);
  });

  it.each(controllers)('%s: admin acessa qualquer unidade', (_name, controller) => {
    const result = controller.validateProgramAccess(
      { userRole: 'admin', allowedProgramIds: [] },
      UUID_B
    );
    expect(result.ok).toBe(true);
  });

  it.each(controllers)('%s: coordenador acessa unidade vinculada', (_name, controller) => {
    const result = controller.validateProgramAccess(
      { userRole: 'coordenador', allowedProgramIds: [UUID_A, UUID_B] },
      UUID_B
    );
    expect(result.ok).toBe(true);
  });

  it.each(controllers)('%s: coordenador NAO acessa unidade de outra unidade', (_name, controller) => {
    const result = controller.validateProgramAccess(
      { userRole: 'coordenador', allowedProgramIds: [UUID_A] },
      UUID_B
    );
    expect(result.ok).toBe(false);
  });
});

describe('Boundary HTTP em /api/students', () => {
  it('sem token retorna 401', async () => {
    await request(app).get('/api/students').expect(401);
  });

  it('token mal formatado retorna 401', async () => {
    await request(app)
      .get('/api/students')
      .set('Authorization', 'Bearer token-invalido')
      .expect(401);
  });

  it('coordenador sem unidade selecionada retorna 403 (não vaza dados)', async () => {
    const token = tokenFor({
      id: 'user-1',
      email: 'coord@sos.org',
      role: 'coordenador',
      selectedProgramId: null,
      allowedProgramIds: [UUID_A],
    });

    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('coordenador com unidade nao-UUID no JWT é barrado com 400', async () => {
    const token = tokenFor({
      id: 'user-1',
      email: 'coord@sos.org',
      role: 'coordenador',
      selectedProgramId: 'unidade-falsa',
      allowedProgramIds: ['unidade-falsa'],
    });

    await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
