import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import type { SelectContextDto } from './schemas/select-context.schema';
import * as bcrypt from 'bcrypt';
import { AuthRepository } from './auth.repository';
import type { LoginDto } from './schemas/login.schema';
import type { ValidateTokenDto } from './schemas/validate-token.schema';

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async login(dto: LoginDto) {
    const user = await this.repo.findUserByEmail(dto.email);

    if (!user || user.estado !== 'activo') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordOk = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );

    if (!passwordOk) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accesos = await this.repo.findUserAccesses(user.id);

    return {
      usuario: {
        id: user.id,
        nombres: user.nombres,
        apellidos: user.apellidos,
        email: user.email,
      },
      accesos,
    };
  }

  async selectContext(dto: SelectContextDto) {
    const access = await this.repo.findAccessByContext({
      usuarioId: dto.usuarioId,
      sistema: dto.sistema,
      empresaCodigo: dto.empresaCodigo,
    });

    if (!access) {
      throw new ForbiddenException('No tiene acceso al contexto solicitado');
    }

    const payload = {
      sub: access.usuario_id,
      email: access.email,
      nombres: access.nombres,
      sistema: access.sistema,
      empresa: access.empresa_codigo,
      perfil: access.perfil,
      permisos: access.permisos,
    };

    const jwtSecret: Secret =
      process.env.JWT_SECRET ?? 'dev_secret';

    const jwtExpiresIn =
      (process.env.JWT_EXPIRES_IN ?? '8h') as SignOptions['expiresIn'];

    const token = jwt.sign(
      payload,
      jwtSecret,
      {
        expiresIn: jwtExpiresIn,
      },
    );

    return {
      accessToken: token,
      tokenType: 'Bearer',
      expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
      contexto: payload,
    };
  }

  validateToken(dto: ValidateTokenDto) {
    try {
      const jwtSecret: Secret =
        process.env.JWT_SECRET ?? 'dev_secret';

      const payload = jwt.verify(dto.token, jwtSecret);

      return {
        valid: true,
        payload,
      };
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
