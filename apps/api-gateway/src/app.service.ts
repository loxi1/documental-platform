import { Injectable } from '@nestjs/common';
import {
  createLiveResponse,
  createVersionResponse,
} from '@documental/shared';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'api-gateway',
      status: 'ok',
    };
  }

  getLive() {
    return createLiveResponse('api-gateway');
  }

  getReady() {
    return {
      service: 'api-gateway',
      status: 'ok',
      checks: {
        gateway: 'up',
      },
    };
  }

  getVersion() {
    return createVersionResponse('api-gateway');
  }
}