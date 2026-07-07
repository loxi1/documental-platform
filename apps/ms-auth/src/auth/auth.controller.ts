import { Body, Controller, Get, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { loginSchema } from './schemas/login.schema';
import type { LoginDto } from './schemas/login.schema';
import { selectContextSchema } from './schemas/select-context.schema';
import type { SelectContextDto } from './schemas/select-context.schema';
import { selectWorkspaceSchema } from './schemas/select-workspace.schema';
import type { SelectWorkspaceDto } from './schemas/select-workspace.schema';
import { validateTokenSchema } from './schemas/validate-token.schema';
import type { ValidateTokenDto } from './schemas/validate-token.schema';

function extractBearerToken(authHeader?: string) {
  if (!authHeader) return '';
  const [scheme, token] = authHeader.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token ?? '' : authHeader;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({ summary: 'Iniciar sesión y emitir identityToken temporal' })
  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginSchema))
    body: LoginDto,
  ) {
    return this.service.login(body);
  }

  @ApiOperation({ summary: 'Listar workspaces disponibles usando identityToken' })
  @Get('workspaces')
  listWorkspaces(@Headers('authorization') authorization?: string) {
    return this.service.listWorkspaces({
      identityToken: extractBearerToken(authorization),
    });
  }


  @ApiOperation({ summary: 'Listar usuarios sanitizados para administración de accesos' })
  @Get('usuarios')
  listUsuariosAdmin(@Headers('authorization') authorization?: string) {
    return this.service.listUsuariosAdmin(extractBearerToken(authorization));
  }

  @ApiOperation({ summary: 'Obtener usuario sanitizado para administración de accesos' })
  @Get('usuarios/:id')
  findUsuarioAdminById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.service.findUsuarioAdminById({
      id,
      accessToken: extractBearerToken(authorization),
    });
  }

  @ApiOperation({ summary: 'Listar perfiles para administración de accesos' })
  @Get('perfiles')
  listPerfilesAdmin(@Headers('authorization') authorization?: string) {
    return this.service.listPerfilesAdmin(extractBearerToken(authorization));
  }

  @ApiOperation({ summary: 'Obtener perfil para administración de accesos' })
  @Get('perfiles/:id')
  findPerfilAdminById(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.service.findPerfilAdminById({
      id,
      accessToken: extractBearerToken(authorization),
    });
  }

  @ApiOperation({ summary: 'Listar workspaces de usuarios para administración de accesos' })
  @Get('usuario-workspaces')
  listUsuarioWorkspacesAdmin(@Headers('authorization') authorization?: string) {
    return this.service.listUsuarioWorkspacesAdmin({
      accessToken: extractBearerToken(authorization),
    });
  }

  @ApiOperation({ summary: 'Listar workspaces de un usuario para administración de accesos' })
  @Get('usuarios/:id/workspaces')
  listWorkspacesByUsuarioAdmin(
    @Param('id', ParseIntPipe) id: number,
    @Headers('authorization') authorization?: string,
  ) {
    return this.service.listUsuarioWorkspacesAdmin({
      usuarioId: id,
      accessToken: extractBearerToken(authorization),
    });
  }

  @ApiOperation({ summary: 'Seleccionar workspace y emitir JWT contextual' })
  @Post('workspaces/select')
  selectWorkspace(
    @Body(new ZodValidationPipe(selectWorkspaceSchema))
    body: SelectWorkspaceDto,
  ) {
    return this.service.selectWorkspace(body);
  }

  @ApiOperation({ summary: 'Seleccionar contexto legacy; usar /auth/workspaces/select' })
  @Post('select-context')
  selectContext(
    @Body(new ZodValidationPipe(selectContextSchema))
    body: SelectContextDto,
  ) {
    return this.service.selectContext(body);
  }

  @ApiOperation({ summary: 'Validar token JWT contextual' })
  @Post('validate-token')
  validateToken(
    @Body(new ZodValidationPipe(validateTokenSchema))
    body: ValidateTokenDto,
  ) {
    return this.service.validateToken(body);
  }
}
