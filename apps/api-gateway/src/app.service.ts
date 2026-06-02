import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'api-gateway',
      status: 'ok',
    };
  }
}
