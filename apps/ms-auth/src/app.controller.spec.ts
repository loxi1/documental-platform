jest.mock('@documental/database', () => ({
  sql: Object.assign(jest.fn(), {
    end: jest.fn(),
  }),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  const appService = {
    getHealth: jest.fn(),
    getLive: jest.fn(),
    getReady: jest.fn(),
    getVersion: jest.fn(),
    onModuleDestroy: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('delega live en AppService sin cargar una conexión real de base de datos', () => {
    const expected = { service: 'ms-auth', status: 'ok' };
    appService.getLive.mockReturnValue(expected);

    expect(appController.getLive()).toBe(expected);
    expect(appService.getLive).toHaveBeenCalledTimes(1);
  });

  it('delega version en AppService', () => {
    const expected = { service: 'ms-auth', version: 'test' };
    appService.getVersion.mockReturnValue(expected);

    expect(appController.getVersion()).toBe(expected);
    expect(appService.getVersion).toHaveBeenCalledTimes(1);
  });
});
