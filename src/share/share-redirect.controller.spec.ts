import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';

import { ShareRedirectController } from './share-redirect.controller';
import { ShareService } from './share.service';
import { ShareAttributionService } from './share-attribution.service';
import {
  ShareAttributionDto,
  ShareConversionDto,
} from './dto/share-attribution.dto';

describe('ShareRedirectController', () => {
  let controller: ShareRedirectController;
  let shareService: ShareService;
  let shareAttributionService: ShareAttributionService;

  const mockShareService = {
    getShareLinkByCode: jest.fn(),
    createSession: jest.fn(),
    getSessionByToken: jest.fn(),
    trackClick: jest.fn(),
    generateIpHash: jest.fn(),
    generateUaHash: jest.fn(),
    isBot: jest.fn(),
  };

  const mockShareAttributionService = {
    recordAttribution: jest.fn(),
    recordConversion: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ShareRedirectController],
      providers: [
        {
          provide: ShareService,
          useValue: mockShareService,
        },
        {
          provide: ShareAttributionService,
          useValue: mockShareAttributionService,
        },
      ],
    }).compile();

    controller = module.get<ShareRedirectController>(ShareRedirectController);
    shareService = module.get<ShareService>(ShareService);
    shareAttributionService = module.get<ShareAttributionService>(
      ShareAttributionService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('redirect', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
      mockRequest = {
        cookies: {},
        get: jest.fn(),
        ip: '192.168.1.1',
        headers: {},
        user: null,
      } as any;
      mockResponse = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };
    });

    it('should redirect to share link with tracking', async () => {
      const code = 'abc123';
      const mockShareLink = {
        id: '1',
        code,
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        isActive: true,
        content: {
          slug: 'test-article',
        },
        channel: { name: 'twitter' },
        campaign: { name: 'test-campaign' },
      };

      const mockSession = {
        id: 'session1',
        sessionToken: 'token123',
        shareId: '1',
      };

      mockShareService.getShareLinkByCode.mockResolvedValue(mockShareLink);
      mockShareService.getSessionByToken.mockResolvedValue(null);
      mockShareService.createSession.mockResolvedValue(mockSession);
      mockShareService.generateIpHash.mockReturnValue('iphash123');
      mockShareService.generateUaHash.mockReturnValue('uahash123');
      mockShareService.isBot.mockReturnValue(false);
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        if (header === 'Referer') return 'https://google.com';
        return undefined;
      });

      await controller.redirect(
        code,
        mockResponse as Response,
        mockRequest as Request,
      );

      expect(mockShareService.getShareLinkByCode).toHaveBeenCalledWith(code);
      expect(mockShareService.createSession).toHaveBeenCalledWith('1');
      expect(mockShareService.trackClick).toHaveBeenCalledWith(
        '1',
        'session1',
        {
          event: 'click',
          referrer: 'https://google.com',
          userAgent: 'Mozilla/5.0',
          country: undefined,
          ipHash: 'iphash123',
          uaHash: 'uahash123',
          isBot: false,
          isCountable: true,
        },
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith('sid', 'token123', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        302,
        expect.stringContaining('/articles/test-article'),
      );
    });

    it('should throw 404 if share link not found', async () => {
      const code = 'nonexistent';
      mockShareService.getShareLinkByCode.mockResolvedValue(null);

      await expect(
        controller.redirect(
          code,
          mockResponse as Response,
          mockRequest as Request,
        ),
      ).rejects.toThrow(
        new HttpException('Share link not found', HttpStatus.NOT_FOUND),
      );
    });

    it('should throw 410 if share link is inactive', async () => {
      const code = 'abc123';
      const mockShareLink = {
        id: '1',
        code,
        isActive: false,
      };

      mockShareService.getShareLinkByCode.mockResolvedValue(mockShareLink);

      await expect(
        controller.redirect(
          code,
          mockResponse as Response,
          mockRequest as Request,
        ),
      ).rejects.toThrow(
        new HttpException('Share link is inactive', HttpStatus.GONE),
      );
    });

    it('should detect prefetch requests', async () => {
      const code = 'abc123';
      const mockShareLink = {
        id: '1',
        code,
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        isActive: true,
        content: { slug: 'test-article' },
      };

      const mockSession = {
        id: 'session1',
        sessionToken: 'token123',
        shareId: '1',
      };

      mockShareService.getShareLinkByCode.mockResolvedValue(mockShareLink);
      mockShareService.getSessionByToken.mockResolvedValue(mockSession);
      mockShareService.generateIpHash.mockReturnValue('iphash123');
      mockShareService.generateUaHash.mockReturnValue('uahash123');
      mockShareService.isBot.mockReturnValue(false);
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'User-Agent') return 'Mozilla/5.0';
        if (header === 'X-Purpose') return 'prefetch';
        return undefined;
      });

      await controller.redirect(
        code,
        mockResponse as Response,
        mockRequest as Request,
      );

      expect(mockShareService.trackClick).toHaveBeenCalledWith(
        '1',
        'session1',
        {
          event: 'prefetch',
          referrer: undefined,
          userAgent: 'Mozilla/5.0',
          country: undefined,
          ipHash: 'iphash123',
          uaHash: 'uahash123',
          isBot: false,
          isCountable: false,
        },
      );
    });

    it('should detect bot requests', async () => {
      const code = 'abc123';
      const mockShareLink = {
        id: '1',
        code,
        contentType: 'article',
        contentId: '123',
        ownerUserId: '456',
        isActive: true,
        content: { slug: 'test-article' },
      };

      const mockSession = {
        id: 'session1',
        sessionToken: 'token123',
        shareId: '1',
      };

      mockShareService.getShareLinkByCode.mockResolvedValue(mockShareLink);
      mockShareService.getSessionByToken.mockResolvedValue(mockSession);
      mockShareService.generateIpHash.mockReturnValue('iphash123');
      mockShareService.generateUaHash.mockReturnValue('uahash123');
      mockShareService.isBot.mockReturnValue(true);
      mockRequest.get = jest.fn().mockImplementation((header) => {
        if (header === 'User-Agent') return 'Googlebot/2.1';
        return undefined;
      });

      await controller.redirect(
        code,
        mockResponse as Response,
        mockRequest as Request,
      );

      expect(mockShareService.trackClick).toHaveBeenCalledWith(
        '1',
        'session1',
        {
          event: 'click',
          referrer: undefined,
          userAgent: 'Googlebot/2.1',
          country: undefined,
          ipHash: 'iphash123',
          uaHash: 'uahash123',
          isBot: true,
          isCountable: false,
        },
      );
    });
  });

  describe('recordAttribution', () => {
    it('should record attribution successfully', async () => {
      const attributionData: ShareAttributionDto = {
        sessionToken: 'token123',
        viewerUserId: 'user456',
      };

      const mockSession = {
        id: 'session1',
        shareId: 'share789',
      };

      mockShareService.getSessionByToken.mockResolvedValue(mockSession);
      mockShareAttributionService.recordAttribution.mockResolvedValue({});

      const result = await controller.recordAttribution(attributionData);

      expect(result).toEqual({ success: true });
      expect(
        mockShareAttributionService.recordAttribution,
      ).toHaveBeenCalledWith({
        ...attributionData,
        shareId: 'share789',
      });
    });

    it('should throw error for invalid session token', async () => {
      const attributionData: ShareAttributionDto = {
        sessionToken: 'invalid',
        viewerUserId: 'user456',
      };

      mockShareService.getSessionByToken.mockResolvedValue(null);

      await expect(
        controller.recordAttribution(attributionData),
      ).rejects.toThrow(
        new HttpException('Invalid session token', HttpStatus.BAD_REQUEST),
      );
    });
  });

  describe('recordConversion', () => {
    it('should record conversion successfully', async () => {
      const conversionData: ShareConversionDto = {
        sessionToken: 'token123',
        convType: 'subscribe',
        convValue: 10.0,
        viewerUserId: 'user456',
      };

      const mockSession = {
        id: 'session1',
        shareId: 'share789',
      };

      mockShareService.getSessionByToken.mockResolvedValue(mockSession);
      mockShareAttributionService.recordConversion.mockResolvedValue({});

      const result = await controller.recordConversion(conversionData);

      expect(result).toEqual({ success: true });
      expect(mockShareAttributionService.recordConversion).toHaveBeenCalledWith(
        {
          ...conversionData,
          shareId: 'share789',
        },
      );
    });

    it('should throw error for invalid session token', async () => {
      const conversionData: ShareConversionDto = {
        sessionToken: 'invalid',
        convType: 'subscribe',
        convValue: 10.0,
        viewerUserId: 'user456',
      };

      mockShareService.getSessionByToken.mockResolvedValue(null);

      await expect(controller.recordConversion(conversionData)).rejects.toThrow(
        new HttpException('Invalid session token', HttpStatus.BAD_REQUEST),
      );
    });
  });
});
