import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from 'src/shared/services';
import { PermissionsService } from 'src/permissions/permissions.service';
import { ORGANIZATION_CONSTANTS } from 'src/shared/constants';
import { OrganizationsService } from './organizations.service';
import { Organization } from './entities/organization.entity';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { GetOrganizationDto } from './dto/get-organization.dto';

/**
 * Mock data for testing
 */
const mockOrganization: Partial<Organization> = {
  id: '1234567890123456789',
  uuid: 'org-uuid-123',
  name: 'Test Organization',
  slug: 'test-organization',
  description: 'A test organization',
  websiteUrl: 'https://test-org.com',
  logoUrl: 'https://test-org.com/logo.png',
  visibility: ORGANIZATION_CONSTANTS.VISIBILITY.PUBLIC,
  status: ORGANIZATION_CONSTANTS.STATUS.ACTIVE,
  ownerId: 'owner-uuid-123',
  memberCount: 1,
  articleCount: 0,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  deletedAt: null,
  version: 1,
  owner: {
    id: 'owner-uuid-123',
    username: 'testowner',
    avatar: { url: 'https://test-org.com/avatar.png' },
  } as any,
  logoId: 'logo-uuid-123',
  roles: [],
  toJSON: () => ({}),
  isDeleted: () => false,
  getAge: () => 0,
  getTimeSinceUpdate: () => 0,
};

const mockCreateOrganizationDto: CreateOrganizationDto = {
  name: 'Test Organization',
  slug: 'test-organization',
  description: 'A test organization',
  websiteUrl: 'https://test-org.com',
  logoUrl: 'https://test-org.com/logo.png',
  visibility: ORGANIZATION_CONSTANTS.VISIBILITY.PUBLIC,
  ownerId: 'owner-uuid-123',
};

const mockUpdateOrganizationDto: UpdateOrganizationDto = {
  name: 'Updated Organization',
  description: 'An updated test organization',
};

const mockGetOrganizationDto: GetOrganizationDto = {
  page: 1,
  limit: 10,
  sortBy: 'createdAt',
  order: 'DESC',
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let organizationRepository: Repository<Organization>;
  let cacheService: CacheService;
  let permissionsService: PermissionsService;

  // Mock repository methods
  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    softDelete: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
      getMany: jest.fn(),
    })),
  };

  // Mock cache service
  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    deleteKeysByPattern: jest.fn(),
    exists: jest.fn(),
  };

  // Mock permissions service
  const mockPermissionsService = {
    createDefaultRoles: jest.fn(),
    update: jest.fn(),
    findById: jest.fn(),
    assignRole: jest.fn(),
    removeRole: jest.fn(),
    hasPermission: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepository,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    organizationRepository = module.get<Repository<Organization>>(
      getRepositoryToken(Organization),
    );
    cacheService = module.get<CacheService>(CacheService);
    permissionsService = module.get<PermissionsService>(PermissionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrganization', () => {
    it('should create a new organization successfully', async () => {
      // Arrange
      const createDto = { ...mockCreateOrganizationDto };
      const expectedOrganization = { ...mockOrganization } as Organization;

      mockRepository.create = jest.fn().mockReturnValue(expectedOrganization);
      mockRepository.save = jest.fn().mockResolvedValue(expectedOrganization);
      mockPermissionsService.createDefaultRoles = jest.fn().mockResolvedValue([
        { id: 'role1', name: 'admin' },
        { id: 'role2', name: 'member' },
      ]);
      mockPermissionsService.update = jest.fn().mockResolvedValue({});

      // Act
      const result = await service.createOrganization(createDto);

      // Assert
      expect(result).toEqual(expectedOrganization);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: createDto.name,
          slug: createDto.slug,
          description: createDto.description,
          websiteUrl: createDto.websiteUrl,
          logoUrl: createDto.logoUrl,
          visibility: createDto.visibility,
          ownerId: createDto.ownerId,
          status: ORGANIZATION_CONSTANTS.STATUS.ACTIVE,
          memberCount: 1,
          articleCount: 0,
        }),
      );
      expect(mockPermissionsService.createDefaultRoles).toHaveBeenCalled();
    });

    it('should generate slug if not provided', async () => {
      // Arrange
      const createDto = { ...mockCreateOrganizationDto };
      delete createDto.slug;

      // Mock slug generation
      jest
        .spyOn(service as any, 'generateUniqueSlug')
        .mockResolvedValue('generated-slug');
      mockRepository.create = jest.fn().mockReturnValue(mockOrganization);
      mockRepository.save = jest.fn().mockResolvedValue(mockOrganization);
      mockPermissionsService.createDefaultRoles = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.createOrganization(createDto);

      // Assert
      expect(service['generateUniqueSlug']).toHaveBeenCalledWith(
        createDto.name,
      );
    });

    it('should throw HttpException when default roles creation fails', async () => {
      // Arrange
      const createDto = { ...mockCreateOrganizationDto };
      mockRepository.create = jest.fn().mockReturnValue(mockOrganization);
      mockRepository.save = jest.fn().mockResolvedValue(mockOrganization);
      mockPermissionsService.createDefaultRoles = jest
        .fn()
        .mockRejectedValue(new Error('Failed to create roles'));

      // Act & Assert
      await expect(service.createOrganization(createDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.createOrganization(createDto)).rejects.toThrow(
        'organization.ORGANIZATION_DEFAULT_ROLES_FAILED',
      );
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const createDto = { ...mockCreateOrganizationDto };
      mockRepository.create = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(service.createOrganization(createDto)).rejects.toThrow(
        HttpException,
      );
      await expect(service.createOrganization(createDto)).rejects.toThrow(
        'organization.ORGANIZATION_INTERNAL_SERVER_ERROR',
      );
    });
  });

  describe('updateOrganization', () => {
    it('should update organization successfully', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const updateDto = { ...mockUpdateOrganizationDto };
      const updatedOrganization = {
        ...mockOrganization,
        ...updateDto,
      } as Organization;

      // Mock findById to return existing organization
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockOrganization as Organization);
      mockRepository.update = jest.fn().mockResolvedValue({ affected: 1 });
      mockRepository.findOne = jest.fn().mockResolvedValue(updatedOrganization);

      // Act
      const result = await service.updateOrganization(
        organizationId,
        updateDto,
      );

      // Assert
      expect(result).toEqual(updatedOrganization);
      expect(service.findById).toHaveBeenCalledWith(organizationId);
    });

    it('should throw HttpException when organization not found', async () => {
      // Arrange
      const organizationId = 'non-existent-id';
      const updateDto = { ...mockUpdateOrganizationDto };

      jest.spyOn(service, 'findById').mockResolvedValue(null as any);

      // Act & Assert
      await expect(
        service.updateOrganization(organizationId, updateDto),
      ).rejects.toThrow(HttpException);
      await expect(
        service.updateOrganization(organizationId, updateDto),
      ).rejects.toThrow('organization.ORGANIZATION_NOT_FOUND');
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const updateDto = { ...mockUpdateOrganizationDto };

      jest.spyOn(service, 'findById').mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(
        service.updateOrganization(organizationId, updateDto),
      ).rejects.toThrow(HttpException);
      await expect(
        service.updateOrganization(organizationId, updateDto),
      ).rejects.toThrow('organization.ORGANIZATION_INTERNAL_SERVER_ERROR');
    });
  });

  describe('findById', () => {
    it('should return organization when found', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      mockRepository.findOne = jest
        .fn()
        .mockResolvedValue(mockOrganization as Organization);

      // Act
      const result = await service.findById(organizationId);

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: organizationId },
        relations: ['owner'],
      });
    });

    it('should throw HttpException when organization not found', async () => {
      // Arrange
      const organizationId = 'non-existent-id';
      mockRepository.findOne = jest.fn().mockResolvedValue(null as any);

      // Act & Assert
      await expect(service.findById(organizationId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.findById(organizationId)).rejects.toThrow(
        'organization.ORGANIZATION_NOT_FOUND',
      );
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      mockRepository.findOne = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(service.findById(organizationId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.findById(organizationId)).rejects.toThrow(
        'organization.ORGANIZATION_INTERNAL_SERVER_ERROR',
      );
    });
  });

  describe('findBySlug', () => {
    it('should return organization when found by slug', async () => {
      // Arrange
      const slug = 'test-organization';
      mockRepository.findOne = jest
        .fn()
        .mockResolvedValue(mockOrganization as Organization);

      // Act
      const result = await service.findBySlug(slug);

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(mockRepository.findOne).toHaveBeenCalledWith(
        { slug },
        { relations: ['owner'] },
      );
    });

    it('should return null when organization not found by slug', async () => {
      // Arrange
      const slug = 'non-existent-slug';
      mockRepository.findOne = jest.fn().mockResolvedValue(null as any);

      // Act
      const result = await service.findBySlug(slug);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByOwnerId', () => {
    it('should return organizations owned by user', async () => {
      // Arrange
      const ownerId = 'owner-uuid-123';
      const ownedOrganizations = [mockOrganization as Organization];
      mockRepository.find = jest.fn().mockResolvedValue(ownedOrganizations);

      // Act
      const result = await service.findByOwnerId(ownerId);

      // Assert
      expect(result).toEqual(ownedOrganizations);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { ownerId },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('findByMemberId', () => {
    it('should return organizations where user is a member', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const memberOrganizations = [mockOrganization];
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(memberOrganizations),
      };
      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.findByMemberId(userId);

      // Assert
      expect(result).toEqual(memberOrganizations);
      expect(mockQueryBuilder.innerJoin).toHaveBeenCalledWith(
        'user_organizations',
        'uo',
        'uo.organizationId = organization.id',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'uo.userId = :userId',
        { userId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'uo.isActive = :isActive',
        { isActive: true },
      );
    });
  });

  describe('updateMemberCount', () => {
    it('should increment member count', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const increment = 1;
      mockRepository.increment = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      await service.updateMemberCount(organizationId, increment);

      // Assert
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: organizationId },
        'memberCount',
        increment,
      );
    });

    it('should decrement member count', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const increment = -1;
      mockRepository.increment = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      await service.updateMemberCount(organizationId, increment);

      // Assert
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: organizationId },
        'memberCount',
        increment,
      );
    });
  });

  describe('updateArticleCount', () => {
    it('should increment article count', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const increment = 1;
      mockRepository.increment = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      await service.updateArticleCount(organizationId, increment);

      // Assert
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: organizationId },
        'articleCount',
        increment,
      );
    });

    it('should decrement article count', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const increment = -1;
      mockRepository.increment = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      await service.updateArticleCount(organizationId, increment);

      // Assert
      expect(mockRepository.increment).toHaveBeenCalledWith(
        { id: organizationId },
        'articleCount',
        increment,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete organization successfully', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockOrganization as Organization);
      mockRepository.update = jest.fn().mockResolvedValue({ affected: 1 });

      // Act
      await service.remove(organizationId);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(organizationId);
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: organizationId },
        { deletedAt: expect.any(Date) },
      );
    });

    it('should throw HttpException when organization not found', async () => {
      // Arrange
      const organizationId = 'non-existent-id';
      jest.spyOn(service, 'findById').mockResolvedValue(null as any);

      // Act & Assert
      await expect(service.remove(organizationId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.remove(organizationId)).rejects.toThrow(
        'organization.ORGANIZATION_NOT_FOUND',
      );
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      jest.spyOn(service, 'findById').mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(service.remove(organizationId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.remove(organizationId)).rejects.toThrow(
        'organization.ORGANIZATION_INTERNAL_SERVER_ERROR',
      );
    });
  });

  describe('hasOrganizationPermission', () => {
    it('should return true for organization owner', async () => {
      // Arrange
      const userId = 'owner-uuid-123';
      const organizationId = '1234567890123456789';
      const permission = 'ORGANIZATION_MANAGE_MEMBERS';

      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockOrganization as Organization);

      // Act
      const result = await service.hasOrganizationPermission(
        userId,
        organizationId,
        permission,
      );

      // Assert
      expect(result).toBe(true);
      expect(service.findById).toHaveBeenCalledWith(organizationId);
    });

    it('should check permissions for non-owner users', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const permission = 'ORGANIZATION_MANAGE_MEMBERS';

      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockOrganization as Organization);
      mockPermissionsService.hasPermission = jest.fn().mockResolvedValue(true);

      // Act
      const result = await service.hasOrganizationPermission(
        userId,
        organizationId,
        permission,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockPermissionsService.hasPermission).toHaveBeenCalledWith(
        userId,
        BigInt(permission),
        organizationId,
      );
    });
  });

  describe('getOrganizationMembers', () => {
    it('should return organization members with roles', async () => {
      // Arrange
      const organizationId = '1234567890123456789';
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockOrganization),
      };
      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      // Act
      const result = await service.getOrganizationMembers(organizationId);

      // Assert
      expect(result).toEqual(mockOrganization);
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'organization.userOrganizations',
        'userOrg',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'userOrg.user',
        'user',
      );
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        'userOrg.role',
        'role',
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'organization.id = :organizationId',
        { organizationId },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'userOrg.isActive = :isActive',
        { isActive: true },
      );
    });
  });

  describe('assignOrganizationRole', () => {
    it('should assign role to user successfully', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'role-uuid-123';
      const reason = 'Test role assignment';

      const mockRole = { id: roleId, name: 'admin' };
      const mockUserOrg = { ownerId: 'owner-uuid-123' };

      mockPermissionsService.findById = jest.fn().mockResolvedValue(mockRole);
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUserOrg),
      };
      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);
      mockPermissionsService.assignRole = jest.fn().mockResolvedValue({});

      // Act
      await service.assignOrganizationRole(
        userId,
        organizationId,
        roleId,
        reason,
      );

      // Assert
      expect(mockPermissionsService.findById).toHaveBeenCalledWith(roleId);
      expect(mockPermissionsService.assignRole).toHaveBeenCalledWith({
        userId,
        roleId,
        reason,
        assignedBy: mockUserOrg.ownerId,
        isTemporary: false,
      });
    });

    it('should throw HttpException when role not found', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'non-existent-role';

      mockPermissionsService.findById = jest
        .fn()
        .mockResolvedValue(null as any);

      // Act & Assert
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow('organization.ORGANIZATION_ROLE_NOT_FOUND');
    });

    it('should throw HttpException when user not found in organization', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'role-uuid-123';

      const mockRole = { id: roleId, name: 'admin' };
      mockPermissionsService.findById = jest.fn().mockResolvedValue(mockRole);
      const mockQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null as any),
      };
      mockRepository.createQueryBuilder = jest
        .fn()
        .mockReturnValue(mockQueryBuilder);

      // Act & Assert
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow('organization.ORGANIZATION_MEMBER_NOT_FOUND');
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'role-uuid-123';

      mockPermissionsService.findById = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.assignOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow('organization.ORGANIZATION_INTERNAL_SERVER_ERROR');
    });
  });

  describe('removeOrganizationRole', () => {
    it('should remove role from user successfully', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'role-uuid-123';

      jest
        .spyOn(service, 'findById')
        .mockResolvedValue(mockOrganization as Organization);
      mockPermissionsService.removeRole = jest
        .fn()
        .mockResolvedValue(undefined);

      // Act
      await service.removeOrganizationRole(userId, organizationId, roleId);

      // Assert
      expect(service.findById).toHaveBeenCalledWith(organizationId);
      expect(mockPermissionsService.removeRole).toHaveBeenCalledWith(
        userId,
        roleId,
      );
    });

    it('should throw HttpException when organization not found', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = 'non-existent-id';
      const roleId = 'role-uuid-123';

      jest.spyOn(service, 'findById').mockResolvedValue(null as any);

      // Act & Assert
      await expect(
        service.removeOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.removeOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow('organization.ORGANIZATION_NOT_FOUND');
    });

    it('should throw HttpException on general error', async () => {
      // Arrange
      const userId = 'user-uuid-123';
      const organizationId = '1234567890123456789';
      const roleId = 'role-uuid-123';

      jest.spyOn(service, 'findById').mockImplementation(() => {
        throw new Error('Database error');
      });

      // Act & Assert
      await expect(
        service.removeOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow(HttpException);
      await expect(
        service.removeOrganizationRole(userId, organizationId, roleId),
      ).rejects.toThrow('organization.ORGANIZATION_INTERNAL_SERVER_ERROR');
    });
  });

  describe('findAll', () => {
    it('should return paginated organizations', async () => {
      // Arrange
      const getDto = { ...mockGetOrganizationDto };
      const mockPaginatedResult = {
        result: [mockOrganization],
        metaData: {
          currentPage: 1,
          pageSize: 10,
          totalRecords: 1,
          totalPages: 1,
        },
      };

      jest.spyOn(service, 'listOffset').mockResolvedValue(mockPaginatedResult);

      // Act
      const result = await service.findAll(getDto);

      // Assert
      expect(result).toEqual(mockPaginatedResult);
      expect(service.listOffset).toHaveBeenCalledWith(getDto);
    });
  });

  describe('getSearchableColumns', () => {
    it('should return correct searchable columns', () => {
      // Act
      const result = service['getSearchableColumns']();

      // Assert
      expect(result).toEqual(['name', 'description', 'slug']);
    });
  });
});
