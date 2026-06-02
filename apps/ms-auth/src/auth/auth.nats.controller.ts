import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NatsSubjects } from '@documental/shared';

import { AuthService } from './auth.service';
import { loginSchema } from './schemas/login.schema';
import { selectContextSchema } from './schemas/select-context.schema';
import { validateTokenSchema } from './schemas/validate-token.schema';

@Controller()
export class AuthNatsController {
  constructor(private readonly service: AuthService) {}

  @MessagePattern(NatsSubjects.AuthLogin)
  login(@Payload() payload: unknown) {
    const dto = loginSchema.parse(payload);
    return this.service.login(dto);
  }

  @MessagePattern(NatsSubjects.AuthSelectContext)
  selectContext(@Payload() payload: unknown) {
    const dto = selectContextSchema.parse(payload);
    return this.service.selectContext(dto);
  }

  @MessagePattern(NatsSubjects.AuthValidateToken)
  validateToken(@Payload() payload: unknown) {
    const dto = validateTokenSchema.parse(payload);
    return this.service.validateToken(dto);
  }
}
