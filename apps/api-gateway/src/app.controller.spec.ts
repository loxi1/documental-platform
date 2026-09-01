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

  it('delega live en AppService', () => {
    const expected = { service: 'api-gateway', status: 'ok' };
    appService.getLive.mockReturnValue(expected);

    expect(appController.getLive()).toBe(expected);
    expect(appService.getLive).toHaveBeenCalledTimes(1);
  });

  it('delega version en AppService', () => {
    const expected = { service: 'api-gateway', version: 'test' };
    appService.getVersion.mockReturnValue(expected);

    expect(appController.getVersion()).toBe(expected);
    expect(appService.getVersion).toHaveBeenCalledTimes(1);
  });
});
