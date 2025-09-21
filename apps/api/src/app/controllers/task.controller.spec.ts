import { Test, TestingModule } from '@nestjs/testing';
import { TaskController } from './task.controller';
import { TaskService } from '../services/task.service';

describe('TaskController', () => {
  let controller: TaskController;
  let service: TaskService;

  const mockTaskService = {
    createTask: jest.fn(),
    listAllTasks: jest.fn(),
    listOrgTasks: jest.fn(),
    listTasks: jest.fn(),
    listCategories: jest.fn(),
    updateTaskOrder: jest.fn(),
    updateTaskStatus: jest.fn(),
    getTask: jest.fn(),
    canAccessTask: jest.fn(),
    editTask: jest.fn(),
    deleteTask: jest.fn(),
    getAuditLog: jest.fn(),
  };

  const mockReq = {
    user: { id: 1, role: 'Owner', orgId: 2 },
    query: {},
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        { provide: TaskService, useValue: mockTaskService },
      ],
    }).compile();

    controller = module.get<TaskController>(TaskController);
    service = module.get<TaskService>(TaskService);

    jest.clearAllMocks();
  });

  it('should create a task', async () => {
    mockTaskService.createTask.mockResolvedValue('created');
    const dto = { title: 'Test' };
    await expect(controller.createTask(mockReq, dto)).resolves.toBe('created');
    expect(service.createTask).toHaveBeenCalledWith(1, dto);
  });

  it('should list all tasks for Admin', async () => {
    mockReq.user.role = 'Admin';
    mockTaskService.listAllTasks.mockResolvedValue(['task']);
    await expect(controller.listTasks(mockReq)).resolves.toEqual(['task']);
    expect(service.listAllTasks).toHaveBeenCalled();
  });

  it('should list org tasks for Owner', async () => {
    mockReq.user.role = 'Owner';
    mockTaskService.listOrgTasks.mockResolvedValue(['orgTask']);
    await expect(controller.listTasks(mockReq)).resolves.toEqual(['orgTask']);
    expect(service.listOrgTasks).toHaveBeenCalledWith(2);
  });

  it('should list user tasks for Viewer', async () => {
    mockReq.user.role = 'Viewer';
    mockTaskService.listTasks.mockResolvedValue(['userTask']);
    mockReq.query = { sort: 'asc', category: 'cat', status: 'open' };
    await expect(controller.listTasks(mockReq)).resolves.toEqual(['userTask']);
    expect(service.listTasks).toHaveBeenCalledWith(1, {
      sort: 'asc',
      filter: { status: 'open' },
      category: 'cat',
    });
  });

  it('should list categories', async () => {
    mockTaskService.listCategories.mockResolvedValue(['cat']);
    await expect(controller.listCategories(mockReq)).resolves.toEqual(['cat']);
    expect(service.listCategories).toHaveBeenCalledWith(1);
  });

  it('should update task order', async () => {
    mockTaskService.updateTaskOrder.mockResolvedValue('ordered');
    const body = { order: 2 };
    await expect(controller.updateOrder(mockReq, 5, body)).resolves.toBe('ordered');
    expect(service.updateTaskOrder).toHaveBeenCalledWith(1, 5, 2);
  });

  it('should update task status', async () => {
    mockTaskService.updateTaskStatus.mockResolvedValue('status-updated');
    const body = { status: 'done' };
    await expect(controller.updateStatus(mockReq, 5, body)).resolves.toBe('status-updated');
    expect(service.updateTaskStatus).toHaveBeenCalledWith(1, 5, 'done');
  });

  it('should edit task if access allowed', async () => {
    mockTaskService.getTask.mockResolvedValue({ id: 5 });
    mockTaskService.canAccessTask.mockReturnValue(true);
    mockTaskService.editTask.mockResolvedValue('edited');
    const dto = { title: 'Edit' };
    await expect(controller.editTask(mockReq, 5, dto)).resolves.toBe('edited');
    expect(service.editTask).toHaveBeenCalledWith(1, 5, dto);
  });

  it('should throw error if edit access denied', async () => {
    mockTaskService.getTask.mockResolvedValue({ id: 5 });
    mockTaskService.canAccessTask.mockReturnValue(false);
    await expect(controller.editTask(mockReq, 5, {})).rejects.toThrow('Forbidden');
  });

  it('should delete task if access allowed', async () => {
    mockTaskService.getTask.mockResolvedValue({ id: 5 });
    mockTaskService.canAccessTask.mockReturnValue(true);
    mockTaskService.deleteTask.mockResolvedValue('deleted');
    await expect(controller.deleteTask(mockReq, 5)).resolves.toBe('deleted');
    expect(service.deleteTask).toHaveBeenCalledWith(1, 5);
  });

  it('should throw error if delete access denied', async () => {
    mockTaskService.getTask.mockResolvedValue({ id: 5 });
    mockTaskService.canAccessTask.mockReturnValue(false);
    await expect(controller.deleteTask(mockReq, 5)).rejects.toThrow('Forbidden');
  });

  it('should get audit log', async () => {
    mockTaskService.getAuditLog.mockResolvedValue(['log']);
    await expect(controller.getAuditLog()).resolves.toEqual(['log']);
    expect(service.getAuditLog).toHaveBeenCalled();
  });
});
