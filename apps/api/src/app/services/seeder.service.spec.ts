import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeederService } from './seeder.service';
import { Organization } from '../models/organization.entity';
import { Role } from '../models/role.entity';
import { Permission } from '../models/permission.entity';
import { User } from '../models/user.entity';
import { Task } from '../models/task.entity';

describe('SeederService', () => {
  let service: SeederService;
  let orgRepo: Repository<Organization>;
  let roleRepo: Repository<Role>;
  let permRepo: Repository<Permission>;
  let userRepo: Repository<User>;
  let taskRepo: Repository<Task>;

  const mockRepository = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeederService,
        {
          provide: getRepositoryToken(Organization),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Role),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Permission),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockRepository(),
        },
      ],
    }).compile();

    service = module.get<SeederService>(SeederService);
    orgRepo = module.get<Repository<Organization>>(getRepositoryToken(Organization));
    roleRepo = module.get<Repository<Role>>(getRepositoryToken(Role));
    permRepo = module.get<Repository<Permission>>(getRepositoryToken(Permission));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
    taskRepo = module.get<Repository<Task>>(getRepositoryToken(Task));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seed', () => {
    it('should seed organizations with parent-child hierarchy', async () => {
      const parentOrg = { id: 1, name: 'ParentOrg' };
      const childOrg = { id: 2, name: 'ChildOrg', parent: parentOrg };

      jest.spyOn(orgRepo, 'findOne')
        .mockResolvedValueOnce(null) // ParentOrg not found
        .mockResolvedValueOnce(null); // ChildOrg not found
      
      jest.spyOn(orgRepo, 'save')
        .mockResolvedValueOnce(parentOrg as Organization)
        .mockResolvedValueOnce(childOrg as Organization);

      // Mock roles as not found
      jest.spyOn(roleRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(roleRepo, 'save').mockImplementation((role) => Promise.resolve(role as Role));

      // Mock permissions as not found
      jest.spyOn(permRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(permRepo, 'save').mockImplementation((perm) => {
        return Promise.resolve({ id: Math.random(), ...perm } as Permission);
      });

      // Mock users and tasks as existing to skip their creation
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ id: 1 } as User);
      jest.spyOn(taskRepo, 'findOne').mockResolvedValue({ id: 1 } as Task);

      await service.seed();

      expect(orgRepo.save).toHaveBeenCalledWith({ name: 'ParentOrg' });
      expect(orgRepo.save).toHaveBeenCalledWith({ name: 'ChildOrg', parent: parentOrg });
    });

    it('should not create organizations if they already exist', async () => {
      const parentOrg = { id: 1, name: 'ParentOrg' };
      const childOrg = { id: 2, name: 'ChildOrg', parent: parentOrg };

      jest.spyOn(orgRepo, 'findOne')
        .mockResolvedValueOnce(parentOrg as Organization)
        .mockResolvedValueOnce(childOrg as Organization);

      // Mock other entities as existing to prevent their creation
      jest.spyOn(roleRepo, 'findOne').mockResolvedValue({ id: 1, name: 'Owner' } as Role);
      jest.spyOn(permRepo, 'findOne').mockResolvedValue({ id: 1, name: 'create_task' } as Permission);
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ id: 1, email: 'owner@org.com' } as User);
      jest.spyOn(taskRepo, 'findOne').mockResolvedValue({ id: 1, title: 'Sample Task' } as Task);

      await service.seed();

      expect(orgRepo.save).not.toHaveBeenCalledWith({ name: 'ParentOrg' });
      expect(orgRepo.save).not.toHaveBeenCalledWith({ name: 'ChildOrg', parent: parentOrg });
    });

    it('should seed roles and assign permissions correctly', async () => {
      const mockOrgs = {
        parentOrg: { id: 1, name: 'ParentOrg' },
        childOrg: { id: 2, name: 'ChildOrg' }
      };

      const mockRoles = [
        { id: 1, name: 'Owner' },
        { id: 2, name: 'Admin' },
        { id: 3, name: 'Viewer' }
      ];

      const mockPermissions = [
        { id: 1, name: 'create_task' },
        { id: 2, name: 'edit_task' },
        { id: 3, name: 'delete_task' },
        { id: 4, name: 'view_task' }
      ];

      // Setup organization mocks
      jest.spyOn(orgRepo, 'findOne')
        .mockResolvedValueOnce(mockOrgs.parentOrg as Organization)
        .mockResolvedValueOnce(mockOrgs.childOrg as Organization);

      // Setup role mocks - all not found initially
      jest.spyOn(roleRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      jest.spyOn(roleRepo, 'save')
        .mockImplementation((role) => {
          if (role.name === 'Owner') return Promise.resolve({ ...mockRoles[0], ...role } as Role);
          if (role.name === 'Admin') return Promise.resolve({ ...mockRoles[1], ...role } as Role);
          if (role.name === 'Viewer') return Promise.resolve({ ...mockRoles[2], ...role } as Role);
          return Promise.resolve(role as Role);
        });

      // Setup permission mocks - all not found initially
      jest.spyOn(permRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      jest.spyOn(permRepo, 'save')
        .mockImplementation((perm) => {
          const found = mockPermissions.find(p => p.name === perm.name);
          return Promise.resolve(found as Permission);
        });

      // Mock user and task as existing
      jest.spyOn(userRepo, 'findOne').mockResolvedValue({ id: 1 } as User);
      jest.spyOn(taskRepo, 'findOne').mockResolvedValue({ id: 1 } as Task);

      await service.seed();

      // Verify roles were created
      expect(roleRepo.save).toHaveBeenCalledWith({ name: 'Owner' });
      expect(roleRepo.save).toHaveBeenCalledWith({ name: 'Admin' });
      expect(roleRepo.save).toHaveBeenCalledWith({ name: 'Viewer' });

      // Verify permissions were assigned
      expect(roleRepo.save).toHaveBeenCalledWith({
        ...mockRoles[0],
        permissions: mockPermissions, // Owner gets all permissions
      });
      expect(roleRepo.save).toHaveBeenCalledWith({
        ...mockRoles[1],
        permissions: mockPermissions.filter(p => p.name !== 'delete_task'), // Admin gets all except delete
      });
      expect(roleRepo.save).toHaveBeenCalledWith({
        ...mockRoles[2],
        permissions: mockPermissions.filter(p => p.name === 'view_task'), // Viewer gets only view
      });
    });

    it('should seed users with correct organizations and roles', async () => {
      const mockOrgs = {
        parentOrg: { id: 1, name: 'ParentOrg' },
        childOrg: { id: 2, name: 'ChildOrg' }
      };

      const mockRoles = [
        { id: 1, name: 'Owner' },
        { id: 2, name: 'Admin' },
        { id: 3, name: 'Viewer' }
      ];

      // Setup mocks
      jest.spyOn(orgRepo, 'findOne')
        .mockResolvedValueOnce(mockOrgs.parentOrg as Organization)
        .mockResolvedValueOnce(mockOrgs.childOrg as Organization);

      jest.spyOn(roleRepo, 'findOne')
        .mockResolvedValueOnce(mockRoles[0] as Role)
        .mockResolvedValueOnce(mockRoles[1] as Role)
        .mockResolvedValueOnce(mockRoles[2] as Role);

      jest.spyOn(roleRepo, 'save').mockImplementation((role) => Promise.resolve(role as Role));

      jest.spyOn(permRepo, 'findOne').mockResolvedValue({ id: 1 } as Permission);
      jest.spyOn(permRepo, 'save').mockResolvedValue({ id: 1 } as Permission);

      // Users not found initially
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValueOnce(null) // owner@org.com
        .mockResolvedValueOnce(null) // admin@org.com
        .mockResolvedValueOnce(null) // viewer@org.com
        .mockResolvedValueOnce({ id: 2, email: 'admin@org.com' } as User); // For task assignment

      jest.spyOn(taskRepo, 'findOne').mockResolvedValue({ id: 1 } as Task);

      await service.seed();

      expect(userRepo.save).toHaveBeenCalledWith({
        email: 'owner@org.com',
        password: 'pass',
        organization: mockOrgs.parentOrg,
        role: mockRoles[0],
      });
      expect(userRepo.save).toHaveBeenCalledWith({
        email: 'admin@org.com',
        password: 'pass',
        organization: mockOrgs.childOrg,
        role: mockRoles[1],
      });
      expect(userRepo.save).toHaveBeenCalledWith({
        email: 'viewer@org.com',
        password: 'pass',
        organization: mockOrgs.childOrg,
        role: mockRoles[2],
      });
    });

    it('should seed tasks with correct properties', async () => {
      const mockOrgs = {
        parentOrg: { id: 1, name: 'ParentOrg' },
        childOrg: { id: 2, name: 'ChildOrg' }
      };

      const adminUser = { id: 2, email: 'admin@org.com' };

      // Setup basic mocks for other entities
      jest.spyOn(orgRepo, 'findOne')
        .mockResolvedValueOnce(mockOrgs.parentOrg as Organization)
        .mockResolvedValueOnce(mockOrgs.childOrg as Organization);

      jest.spyOn(roleRepo, 'findOne').mockResolvedValue({ id: 1 } as Role);
      jest.spyOn(roleRepo, 'save').mockImplementation((role) => Promise.resolve(role as Role));
      jest.spyOn(permRepo, 'findOne').mockResolvedValue({ id: 1 } as Permission);
      jest.spyOn(permRepo, 'save').mockResolvedValue({ id: 1 } as Permission);
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValue({ id: 1 } as User) // Existing users
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce(adminUser as User); // admin@org.com for task assignment

      // Tasks not found initially
      jest.spyOn(taskRepo, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await service.seed();

      expect(taskRepo.save).toHaveBeenCalledWith({
        title: 'Sample Task',
        description: 'This is a seeded task.',
        category: 'Work',
        status: 'Todo',
        order: 1,
        assignedTo: adminUser,
        organization: mockOrgs.childOrg,
      });
      expect(taskRepo.save).toHaveBeenCalledWith({
        title: 'Personal Errand',
        description: 'Buy groceries.',
        category: 'Personal',
        status: 'InProgress',
        order: 2,
        assignedTo: adminUser,
        organization: mockOrgs.childOrg,
      });
      expect(taskRepo.save).toHaveBeenCalledWith({
        title: 'Finish Report',
        description: 'Complete the quarterly report.',
        category: 'Work',
        status: 'Done',
        order: 3,
        assignedTo: adminUser,
        organization: mockOrgs.childOrg,
      });
    });

    it('should not seed tasks if assigned user is not found', async () => {
      // Setup basic mocks
      jest.spyOn(orgRepo, 'findOne').mockResolvedValue({ id: 1 } as Organization);
      jest.spyOn(roleRepo, 'findOne').mockResolvedValue({ id: 1 } as Role);
      jest.spyOn(roleRepo, 'save').mockImplementation((role) => Promise.resolve(role as Role));
      jest.spyOn(permRepo, 'findOne').mockResolvedValue({ id: 1 } as Permission);
      jest.spyOn(permRepo, 'save').mockResolvedValue({ id: 1 } as Permission);
      jest.spyOn(userRepo, 'findOne')
        .mockResolvedValue({ id: 1 } as User)
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce({ id: 1 } as User)
        .mockResolvedValueOnce(null); // admin@org.com not found

      await service.seed();

      expect(taskRepo.save).not.toHaveBeenCalled();
    });
  });
});
