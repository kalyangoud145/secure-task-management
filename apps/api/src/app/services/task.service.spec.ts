import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskService } from './task.service';
import { Task } from '../models/task.entity';
import { User } from '../models/user.entity';
import { Role } from '../models/role.entity';
import { TaskInputDto, TaskEditDto } from '@secure-task-mangement/data';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepo: jest.Mocked<Repository<Task>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let roleRepo: jest.Mocked<Repository<Role>>;

  const mockUser = {
    id: 1,
    email: 'testuser',
    role: { id: 1, name: 'Owner' },
    organization: { id: 1, name: 'Test Org' },
  } as User;

  const mockTask = {
    id: 1,
    title: 'Test Task',
    description: 'Test Description',
    category: 'Test Category',
    status: 'pending',
    order: 1,
    assignedTo: mockUser,
    organization: mockUser.organization,
  } as Task;

  const mockRole = {
    id: 1,
    name: 'Owner',
    permissions: [
      { id: 1, name: 'create_task' },
      { id: 2, name: 'view_task' },
      { id: 3, name: 'edit_task' },
    ],
  } as Role;

  beforeEach(async () => {
    const mockQb = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(Task),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQb),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepo = module.get(getRepositoryToken(Task));
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    const taskInput: TaskInputDto = {
      title: 'New Task',
      description: 'New Description',
      category: 'New Category',
      status: 'pending',
    };

    it('should create a task successfully', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.create.mockReturnValue(mockTask);
      taskRepo.save.mockResolvedValue(mockTask);

      const result = await service.createTask(1, taskInput);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['role', 'organization'],
      });
      expect(taskRepo.create).toHaveBeenCalledWith({
        ...taskInput,
        assignedTo: mockUser,
        organization: mockUser.organization,
        order: 0,
      });
      expect(result).toEqual({
        id: mockTask.id,
        title: mockTask.title,
        description: mockTask.description,
        category: mockTask.category,
        status: mockTask.status,
        order: mockTask.order,
      });
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.createTask(1, taskInput)).rejects.toThrow('Forbidden');
    });

    it('should throw error if user lacks permission', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue({
        ...mockRole,
        permissions: [],
      } as Role);

      await expect(service.createTask(1, taskInput)).rejects.toThrow('Forbidden');
    });
  });

  describe('listTasks', () => {
    it('should list tasks for user with view_task permission', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.find.mockResolvedValue([mockTask]);

      const result = await service.listTasks(1);

      expect(taskRepo.find).toHaveBeenCalledWith({
        where: { organization: mockUser.organization },
        order: {},
        relations: ['assignedTo'],
      });
      expect(result).toHaveLength(1);
    });

    it('should list only assigned tasks for user without view_task permission', async () => {
      const limitedUser = { ...mockUser, role: { id: 2, name: 'Viewer' } } as User;
      userRepo.findOne.mockResolvedValue(limitedUser);
      roleRepo.findOne.mockResolvedValue({
        ...mockRole,
        permissions: [],
      } as Role);
      taskRepo.find.mockResolvedValue([mockTask]);

      const result = await service.listTasks(1);

      expect(taskRepo.find).toHaveBeenCalledWith({
        where: { assignedTo: limitedUser },
        order: {},
        relations: ['assignedTo'],
      });
    });

    it('should apply filters and sorting', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.find.mockResolvedValue([mockTask]);

      await service.listTasks(1, {
        sort: 'title',
        filter: { status: 'completed' },
        category: 'Test Category',
      });

      expect(taskRepo.find).toHaveBeenCalledWith({
        where: {
          organization: mockUser.organization,
          category: 'Test Category',
          status: 'completed',
        },
        order: { title: 'ASC' },
        relations: ['assignedTo'],
      });
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);

      await expect(service.listTasks(1)).rejects.toThrow('Forbidden');
    });
  });

  describe('editTask', () => {
    const editDto: TaskEditDto = {
      title: 'Updated Task',
      description: 'Updated Description',
    };

    it('should edit task successfully', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      taskRepo.findOne.mockResolvedValue(mockTask);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.save.mockResolvedValue({ ...mockTask, ...editDto });

      const result = await service.editTask(1, 1, editDto);

      expect(result.title).toBe(editDto.title);
      expect(result.description).toBe(editDto.description);
    });

    it('should throw error if user not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      taskRepo.findOne.mockResolvedValue(mockTask);

      await expect(service.editTask(1, 1, editDto)).rejects.toThrow('Not found');
    });

    it('should throw error if task not found', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.editTask(1, 1, editDto)).rejects.toThrow('Not found');
    });

    it('should throw error if user lacks permission', async () => {
      const otherOrgUser = {
        ...mockUser,
        organization: { id: 2, name: 'Other Org' },
        role: { id: 1, name: 'Owner' }, // Ensure role has id
      } as User;
      
      // Mock the user lookup
      userRepo.findOne.mockResolvedValue(otherOrgUser);
      
      // Mock the task lookup - ensure task has organization with id
      taskRepo.findOne.mockResolvedValue({
        ...mockTask,
        organization: { id: 1, name: 'Test Org' }, // Different org than user
        assignedTo: { id: 999 } as User, // Different user
      } as Task);
      
      // Mock the role lookup to return no permissions
      roleRepo.findOne.mockResolvedValue({
        id: 1,
        name: 'Owner',
        permissions: [], // No edit_task permission
      } as Role);

      // Just in case, mock save to prevent undefined errors
      taskRepo.save.mockResolvedValue(mockTask);

      await expect(service.editTask(1, 1, editDto)).rejects.toThrow('Forbidden');
    });
  });

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      taskRepo.findOne.mockResolvedValue(mockTask);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.delete.mockResolvedValue({ affected: 1 } as any);

      const result = await service.deleteTask(1, 1);

      expect(taskRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ deleted: true });
    });

    it('should throw error if user or task not found', async () => {
      userRepo.findOne.mockResolvedValue(null);
      taskRepo.findOne.mockResolvedValue(mockTask);

      await expect(service.deleteTask(1, 1)).rejects.toThrow('Not found');
    });

    it('should throw error if user lacks permission', async () => {
      const viewerUser = {
        ...mockUser,
        role: { id: 3, name: 'Viewer' },
      } as User;
      userRepo.findOne.mockResolvedValue(viewerUser);
      taskRepo.findOne.mockResolvedValue({
        ...mockTask,
        assignedTo: { id: 2 } as User,
      });
      roleRepo.findOne.mockResolvedValue({
        ...mockRole,
        permissions: [],
      } as Role);

      await expect(service.deleteTask(1, 1)).rejects.toThrow('Forbidden');
    });
  });

  describe('getAuditLog', () => {
    it('should return audit log', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.create.mockReturnValue(mockTask);
      taskRepo.save.mockResolvedValue(mockTask);

      await service.createTask(1, {
        title: 'Test',
        description: 'Test',
        category: 'Test',
        status: 'pending',
      });

      const auditLog = await service.getAuditLog();

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        userId: 1,
        action: 'CREATE_TASK',
        targetId: 1,
      });
    });
  });

  describe('listCategories', () => {
    it('should list categories with tasks', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { ...mockTask, category: 'Category1' },
          { ...mockTask, category: 'Category1', id: 2 },
          { ...mockTask, category: 'Category2', id: 3 },
        ]),
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      const result = await service.listCategories(1);

      expect(result).toHaveLength(2);
      expect(result[0].category).toBe('Category1');
      expect(result[0].tasks).toHaveLength(2);
      expect(result[1].category).toBe('Category2');
      expect(result[1].tasks).toHaveLength(1);
    });

    it('should filter by assigned user without view_task permission', async () => {
      const mockQb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTask]),
      };
      userRepo.findOne.mockResolvedValue(mockUser);
      roleRepo.findOne.mockResolvedValue({
        ...mockRole,
        permissions: [],
      } as Role);
      taskRepo.createQueryBuilder.mockReturnValue(mockQb as any);

      await service.listCategories(1);

      expect(mockQb.where).toHaveBeenCalledWith(
        'task.assignedToId = :userId',
        { userId: 1 }
      );
    });
  });

  describe('updateTaskOrder', () => {
    it('should update task order successfully', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      taskRepo.findOne.mockResolvedValue(mockTask);
      taskRepo.save.mockResolvedValue({ ...mockTask, order: 5 });

      const result = await service.updateTaskOrder(1, 1, 5);

      expect(result.order).toBe(5);
    });
  });

  describe('updateTaskStatus', () => {
    it('should update task status successfully', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      taskRepo.findOne.mockResolvedValue(mockTask);
      roleRepo.findOne.mockResolvedValue(mockRole);
      taskRepo.save.mockResolvedValue({ ...mockTask, status: 'completed' });

      const result = await service.updateTaskStatus(1, 1, 'completed');

      expect(result.status).toBe('completed');
    });
  });

  describe('canAccessTask', () => {
    it('should allow Admin access to any task', () => {
      const adminUser = { id: 1, role: 'Admin', email: 'admin@org.com', orgId: 1 };
      const result = service.canAccessTask(adminUser, mockTask);
      expect(result).toBe(true);
    });

    it('should allow Owner access to org tasks', () => {
      const ownerUser = { id: 1, role: 'Owner', email: 'owner@org.com', orgId: 1 };
      const result = service.canAccessTask(ownerUser, mockTask);
      expect(result).toBe(true);
    });

    it('should allow Viewer access to assigned tasks only', () => {
      const viewerUser = { id: 1, role: 'Viewer', email: 'viewer@org.com', orgId: 1 };
      const result = service.canAccessTask(viewerUser, mockTask);
      expect(result).toBe(true);

      const viewerUser2 = { id: 2, role: 'Viewer', email: 'viewer2@org.com', orgId: 1 };
      const result2 = service.canAccessTask(viewerUser2, mockTask);
      expect(result2).toBe(false);
    });

    it('should return false for null task', () => {
      const user = { id: 1, role: 'Admin', email: 'admin@org.com', orgId: 1 };
      const result = service.canAccessTask(user, null as any);
      expect(result).toBe(false);
    });
  });

  describe('listAllTasks', () => {
    it('should return all tasks', async () => {
      taskRepo.find.mockResolvedValue([mockTask]);

      const result = await service.listAllTasks();

      expect(taskRepo.find).toHaveBeenCalledWith({
        relations: ['assignedTo', 'organization'],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('listOrgTasks', () => {
    it('should return tasks for specific organization', async () => {
      taskRepo.find.mockResolvedValue([mockTask]);

      const result = await service.listOrgTasks(1);

      expect(taskRepo.find).toHaveBeenCalledWith({
        where: { organization: { id: 1 } },
        relations: ['assignedTo', 'organization'],
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getTask', () => {
    it('should return a single task', async () => {
      taskRepo.findOne.mockResolvedValue(mockTask);

      const result = await service.getTask(1);

      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['assignedTo', 'organization'],
      });
      expect(result).toEqual(mockTask);
    });
  });
});
