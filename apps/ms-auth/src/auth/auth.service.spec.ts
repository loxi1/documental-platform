import {
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
// G2-B: impedir la inicialización de PostgreSQL en pruebas unitarias.
jest.mock('@documental/database', () => ({
  sql: jest.fn(),
}));

import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';

describe('G2-B — cambio de contraseña aislado', () => {
  const secret = 'g2b-test-secret-isolated';
  const previousSecret = process.env.JWT_SECRET;

  let service: AuthService;
  let repo: {
    findUserAuthStateById: jest.Mock;
    changePasswordAndRevokeSessions: jest.Mock;
  };

  const dto = () => ({
    accessToken: '',
    currentPassword: 'ClaveActual123!',
    newPassword: 'ClaveNueva456!',
    confirmPassword: 'ClaveNueva456!',
  });

  const token = (overrides: Record<string, unknown> = {}) =>
    jwt.sign(
      {
        sub: 101,
        workspaceId: 201,
        empresa: 'BBTI',
        sistema: 'DOCUMENTAL',
        perfil: 'admin',
        authVersion: 1,
        ...overrides,
      },
      secret,
      { expiresIn: '1h' },
    );

  beforeAll(() => {
    process.env.JWT_SECRET = secret;
  });

  afterAll(() => {
    if (previousSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = previousSecret;
    }
  });

  beforeEach(() => {
    repo = {
      findUserAuthStateById: jest.fn().mockResolvedValue({
        id: 101,
        estado: 'activo',
        auth_version: 1,
      }),
      changePasswordAndRevokeSessions: jest.fn().mockResolvedValue({
        changed: true,
        authVersion: 2,
      }),
    };

    service = new AuthService(repo as unknown as AuthRepository);
  });

  it('T01 rechaza confirmación diferente', async () => {
    const input = { ...dto(), confirmPassword: 'OtraClave' };

    await expect(service.changePassword(input))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(repo.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('T02 rechaza reutilizar la contraseña actual', async () => {
    const input = {
      ...dto(),
      newPassword: 'ClaveActual123!',
      confirmPassword: 'ClaveActual123!',
    };

    await expect(service.changePassword(input))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(repo.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('T03 rechaza contraseñas superiores a 72 bytes UTF-8', async () => {
    const input = {
      ...dto(),
      newPassword: '🔐'.repeat(19),
      confirmPassword: '🔐'.repeat(19),
    };

    await expect(service.changePassword(input))
      .rejects.toBeInstanceOf(ForbiddenException);

    expect(repo.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('T04 rechaza un JWT inválido', async () => {
    const input = { ...dto(), accessToken: 'jwt-invalido' };

    await expect(service.changePassword(input))
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(repo.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('T05 exige sesión contextual con workspace', async () => {
    const input = { ...dto(), accessToken: token({ workspaceId: undefined }) };

    await expect(service.changePassword(input))
      .rejects.toBeInstanceOf(UnauthorizedException);

    expect(repo.changePasswordAndRevokeSessions).not.toHaveBeenCalled();
  });

  it('T06 rechaza contraseña actual incorrecta', async () => {
    repo.changePasswordAndRevokeSessions.mockResolvedValue({
      changed: false,
      reason: 'INVALID_CURRENT_PASSWORD',
    });

    const input = { ...dto(), accessToken: token() };

    await expect(service.changePassword(input))
      .rejects.toThrow('Contraseña actual incorrecta');

    expect(repo.changePasswordAndRevokeSessions).toHaveBeenCalledTimes(1);
  });

  it('T07 completa el cambio de contraseña y exige nuevo login', async () => {
    const result = await service.changePassword({
      ...dto(),
      accessToken: token(),
    });

    expect(result).toEqual({
      success: true,
      sessionRevoked: true,
      requiresLogin: true,
    });

    expect(repo.changePasswordAndRevokeSessions).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 101,
        expectedAuthVersion: 1,
        currentPassword: 'ClaveActual123!',
        newPassword: 'ClaveNueva456!',
        workspaceId: 201,
      }),
    );
  });

  it('T08 rechaza un token contextual anterior al cambio', async () => {
    repo.findUserAuthStateById.mockResolvedValue({
      id: 101, estado: 'activo', auth_version: 2,
    });

    await expect(service.validateToken({ token: token() }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T09 revoca también el identity token anterior', async () => {
    repo.findUserAuthStateById.mockResolvedValue({
      id: 101, estado: 'activo', auth_version: 2,
    });

    const identityToken = token({
      purpose: 'identity',
      workspaceId: undefined,
    });

    await expect(service.validateToken({ token: identityToken }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T10 revoca tokens de otros workspaces y empresas', async () => {
    repo.findUserAuthStateById.mockResolvedValue({
      id: 101, estado: 'activo', auth_version: 2,
    });

    const otherWorkspace = token({
      workspaceId: 999,
      empresa: 'OTRA_EMPRESA',
    });

    await expect(service.validateToken({ token: otherWorkspace }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T11 rechaza JWT legacy sin authVersion', async () => {
    const legacyToken = jwt.sign({
      sub: 101,
      workspaceId: 201,
      empresa: 'BBTI',
    }, secret);

    await expect(service.validateToken({ token: legacyToken }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T12 bloquea administración con token revocado', async () => {
    repo.findUserAuthStateById.mockResolvedValue({
      id: 101, estado: 'activo', auth_version: 2,
    });

    await expect(service.listUsuariosAdmin(token({ perfil: 'admin' })))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T13 falla de forma cerrada si no puede consultar revocación', async () => {
    repo.findUserAuthStateById.mockRejectedValue(
      new Error('DB_UNAVAILABLE_SIMULATED'),
    );

    await expect(service.validateToken({ token: token() }))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('T14 conserva íntegro el contexto JWT', async () => {
    const permisos = {
      menus: ['compras', 'finanzas'],
      actions: ['compras.subir'],
    };

    const contextualToken = token({
      email: 'prueba@example.test',
      nombres: 'Usuario Prueba',
      clienteDestinoId: 301,
      perfilId: 401,
      permissionVersion: 7,
      sessionContextId: 'g2b-session-test',
      permisos,
    });

    const result = await service.validateToken({
      token: contextualToken,
    });

    expect(result.valid).toBe(true);
    expect(result.payload).toEqual(expect.objectContaining({
      sub: 101,
      email: 'prueba@example.test',
      nombres: 'Usuario Prueba',
      workspaceId: 201,
      empresa: 'BBTI',
      clienteDestinoId: 301,
      sistema: 'DOCUMENTAL',
      perfilId: 401,
      perfil: 'admin',
      permissionVersion: 7,
      authVersion: 1,
      sessionContextId: 'g2b-session-test',
      permisos,
    }));
  });

  it('T15 acepta un token nuevo con versión vigente', async () => {
    repo.findUserAuthStateById.mockResolvedValue({
      id: 101, estado: 'activo', auth_version: 2,
    });

    const newToken = token({ authVersion: 2 });
    const result = await service.validateToken({ token: newToken });

    expect(result.valid).toBe(true);
    expect(result.payload.authVersion).toBe(2);
  });
  it('T16 pure composed login/workspaces/change/relogin preserves claims and globally revokes', async () => {
    const oldPassword = 'SyntheticOld12'; const newPassword = 'SyntheticNew12';
    const user = {id: 14, estado: 'activo', auth_version: 1, password_hash: await bcrypt.hash(oldPassword, 4), email: 'synthetic@example.invalid', nombres: 'Synthetic', apellidos: 'Test'};
    const workspaces = [27, 28].map((id, i) => ({usuario_id: 14, workspace_id: id, empresa_codigo: i ? 'BBTI' : 'BBTEC', cliente_destino_id: i + 1, sistema_codigo: 'DOCUMENTAL', perfil_id: 4, perfil_codigo: 'finanzas', permission_version: 7, permisos: {menus: ['finanzas'], actions: ['finanzas.pagar']}, email: user.email, nombres: user.nombres}));
    const audit: string[] = [];
    const localRepo = {
      findUserByEmail: async () => user,
      findUserAuthStateById: async () => user,
      touchUserLastLogin: async () => {}, touchWorkspaceUsage: async () => {},
      findUserWorkspaceById: async ({workspaceId}: {workspaceId: number}) => workspaces.find(w => w.workspace_id === workspaceId),
      auditEvent: async ({accion}: {accion: string}) => {audit.push(accion);},
      changePasswordAndRevokeSessions: async (input: {currentPassword: string; newPassword: string; expectedAuthVersion: number}) => {
        if (input.expectedAuthVersion !== user.auth_version) return {changed: false, reason: 'TOKEN_REVOKED'};
        if (!await bcrypt.compare(input.currentPassword, user.password_hash)) return {changed: false, reason: 'INVALID_CURRENT_PASSWORD'};
        user.password_hash = await bcrypt.hash(input.newPassword, 4); user.auth_version += 1; audit.push('AUTH_PASSWORD_CHANGED');
        return {changed: true, authVersion: user.auth_version};
      },
    };
    const subject = new AuthService(localRepo as unknown as AuthRepository);
    const login = await subject.login({email: user.email, password: oldPassword});
    const sessions = await Promise.all(workspaces.map(w => subject.selectWorkspace({identityToken: login.identityToken, workspaceId: w.workspace_id, recordar: false})));
    for (const session of sessions) {
      const checked = await subject.validateToken({token: session.accessToken});
      expect(checked.payload).toEqual(expect.objectContaining({...session.contexto, permissionVersion: 7, authVersion: 1}));
    }
    await subject.changePassword({accessToken: sessions[0].accessToken, currentPassword: oldPassword, newPassword, confirmPassword: newPassword});
    expect(user.auth_version).toBe(2);expect(audit.filter(a => a === 'AUTH_PASSWORD_CHANGED')).toHaveLength(1);
    for (const session of sessions) await expect(subject.validateToken({token: session.accessToken})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(subject.selectWorkspace({identityToken: login.identityToken, workspaceId: 28, recordar: false})).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(subject.login({email: user.email, password: oldPassword})).rejects.toBeInstanceOf(UnauthorizedException);
    const nextLogin = await subject.login({email: user.email, password: newPassword});
    const next = await subject.selectWorkspace({identityToken: nextLogin.identityToken, workspaceId: 28, recordar: false});
    const checked = await subject.validateToken({token: next.accessToken});
    expect(checked.payload).toEqual(expect.objectContaining({sub: 14, workspaceId: 28, empresa: 'BBTI', authVersion: 2, permissionVersion: 7, perfil: 'finanzas', clienteDestinoId: 2}));
  });

});
