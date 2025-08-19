import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

interface HelloResponse {
  data: { message: string };
  messageArgs?: Record<string, any>;
  messageKey?: string;
}

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    it('should be defined', () => {
      expect(appController).toBeDefined();
      expect(appService).toBeDefined();
    });

    it('should return response with "Open World!" message', () => {
      const result = appController.getHello() as HelloResponse;
      expect(result).toEqual({
        data: { message: 'Open World!' },
        messageArgs: undefined,
        messageKey: undefined,
      });
    });

    it('should have correct data structure', () => {
      const result = appController.getHello() as HelloResponse;
      expect(result.data).toBeDefined();
      expect(result.data.message).toBe('Open World!');
      expect(typeof result.data.message).toBe('string');
    });

    it('should return expected response format', () => {
      const result = appController.getHello() as HelloResponse;
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('messageArgs');
      expect(result).toHaveProperty('messageKey');
      expect(result.data).toHaveProperty('message');
    });

    it('should call AppService.getHello method', () => {
      const spy = jest.spyOn(appService, 'getHello');
      appController.getHello();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
