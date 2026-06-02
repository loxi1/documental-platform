import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AuthNatsController } from './auth.nats.controller';

@Module({
  controllers: [AuthController, AuthNatsController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
