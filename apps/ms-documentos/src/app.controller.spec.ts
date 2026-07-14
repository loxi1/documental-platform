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
    getResumen: jest.fn(),
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

  it('delega health en AppService sin cargar dependencias ESM externas', () => {
    const expected = { service: 'ms-documentos', status: 'ok' };
    appService.getHealth.mockReturnValue(expected);

    expect(appController.getHealth()).toBe(expected);
    expect(appService.getHealth).toHaveBeenCalledTimes(1);
  });

  it('delega live en AppService', () => {
    const expected = { service: 'ms-documentos', status: 'live' };
    appService.getLive.mockReturnValue(expected);

    expect(appController.getLive()).toBe(expected);
    expect(appService.getLive).toHaveBeenCalledTimes(1);
  });

  it('delega version en AppService', () => {
    const expected = { service: 'ms-documentos', version: 'test' };
    appService.getVersion.mockReturnValue(expected);

    expect(appController.getVersion()).toBe(expected);
    expect(appService.getVersion).toHaveBeenCalledTimes(1);
  });
});
