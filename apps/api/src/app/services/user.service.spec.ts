import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from '../models/user.entity';
import { Role } from '../models/role.entity';
import { Organization } from '../models/organization.entity';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockRole: Role = {
    id: 1,
    name: 'admin',
  } as Role;

  const mockOrganization: Organization = {
    id: 1,
    name: 'Test Organization',
  } as Organization;

  const mockUser: User = {
    id: 1,
    email: 'test@example.com',
    password: 'password123',
    role: mockRole,
    organization: mockOrganization,
  } as User;

  beforeEach(async () => {
    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user data when valid credentials are provided', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        organization: mockUser.organization,
      });

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', password: 'password123' },
        relations: ['role', 'organization'],
      });
    });

    it('should return null when user is not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('invalid@example.com', 'wrongpassword');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'invalid@example.com', password: 'wrongpassword' },
        relations: ['role', 'organization'],
      });
    });

    it('should return null when password is incorrect', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com', password: 'wrongpassword' },
        relations: ['role', 'organization'],
      });
    });

    it('should handle user without role or organization', async () => {
      const userWithoutRelations: User = {
        id: 2,
        email: 'test2@example.com',
        password: 'password123',
        role: null,
        organization: null,
      } as User;

      userRepository.findOne.mockResolvedValue(userWithoutRelations);

      const result = await service.validateUser('test2@example.com', 'password123');

      expect(result).toEqual({
        id: userWithoutRelations.id,
        email: userWithoutRelations.email,
        role: null,
        organization: null,
      });
    });
  });
});
