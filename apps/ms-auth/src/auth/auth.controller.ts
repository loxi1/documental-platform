import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { loginSchema } from './schemas/login.schema';
import type { LoginDto } from './schemas/login.schema';
import { selectContextSchema } from './schemas/select-context.schema';
import type { SelectContextDto } from './schemas/select-context.schema';
import { validateTokenSchema } from './schemas/validate-token.schema';
import type { ValidateTokenDto } from './schemas/validate-token.schema';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @ApiOperation({ summary: 'Iniciar sesión con email y contraseña' })
  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginSchema))
    body: LoginDto,
  ) {
    return this.service.login(body);
  }

  @ApiOperation({ summary: 'Seleccionar sistema/empresa y emitir JWT contextual' })
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
