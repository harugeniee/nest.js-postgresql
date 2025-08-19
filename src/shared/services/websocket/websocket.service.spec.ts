import { Test, TestingModule } from '@nestjs/testing';
import { WebSocketService } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WebSocketService],
    }).compile();

    service = module.get<WebSocketService>(WebSocketService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Connection Management', () => {
    it('should start with zero connections', () => {
      expect(service.getConnectionCount()).toBe(0);
    });

    it('should start with zero rooms', () => {
      expect(service.getRoomCount()).toBe(0);
    });

    it('should return empty active connections array', () => {
      expect(service.getActiveConnections()).toEqual([]);
    });

    it('should return empty active rooms array', () => {
      expect(service.getActiveRooms()).toEqual([]);
    });
  });

  describe('User Status', () => {
    it('should return false for non-existent user', () => {
      expect(service.isUserOnline('non-existent-user')).toBe(false);
    });

    it('should return empty array for non-existent user connections', () => {
      expect(service.getUserConnections('non-existent-user')).toEqual([]);
    });
  });

  describe('Broadcasting', () => {
    it('should not throw error when broadcasting to all with no connections', () => {
      expect(() => {
        service.broadcastToAll('test-event', { message: 'test' });
      }).not.toThrow();
    });

    it('should not throw error when broadcasting to room with no connections', () => {
      expect(() => {
        service.broadcastToRoom('test-room', 'test-event', { message: 'test' });
      }).not.toThrow();
    });

    it('should return false when sending to non-existent user', () => {
      const result = service.sendToUser('non-existent-user', 'test-event', {
        message: 'test',
      });
      expect(result).toBe(false);
    });

    it('should return false when sending to non-existent socket', () => {
      const result = service.sendToSocket('non-existent-socket', 'test-event', {
        message: 'test',
      });
      expect(result).toBe(false);
    });
  });

  describe('Server Instance', () => {
    it('should return server instance', () => {
      const server = service.getServer();
      expect(server).toBeDefined();
    });
  });
});
