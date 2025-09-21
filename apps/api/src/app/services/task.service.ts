/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../models/task.entity';
import { User } from '../models/user.entity';
import { Role } from '../models/role.entity';
import { TaskEditDto, TaskInputDto, UserDto, TaskOutputDto } from '@secure-task-mangement/data';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
  ) {}

  private auditLog: any[] = [];

  private toOutputDto(task: Task): TaskOutputDto {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      order: task.order,
    };
  }

  async createTask(userId: number, dto: TaskInputDto) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    if (!user || !(await this.hasPermission(user, 'create_task'))) throw new Error('Forbidden');
    
    // Increment order of all tasks in the same organization and category
    await this.taskRepo
      .createQueryBuilder()
      .update(Task)
      .set({ order: () => 'order + 1' })
      .where('organizationId = :orgId AND category = :category', { orgId: user.organization.id, category: dto.category })
      .execute();

    // Create new task with order 0
    const task = this.taskRepo.create({ ...dto, assignedTo: user, organization: user.organization, order: 0 });
    const saved = await this.taskRepo.save(task);
    this.logAudit(user, 'CREATE_TASK', saved.id);
    return this.toOutputDto(saved);
  }

  async listTasks(userId: number, options?: { sort?: string, filter?: any, category?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    if (!user) throw new Error('Forbidden');
    const where: any = {};
    if (await this.hasPermission(user, 'view_task')) {
      where.organization = user.organization;
    } else {
      where.assignedTo = user;
    }
    if (options?.category) where.category = options.category;
    if (options?.filter) Object.assign(where, options.filter);

    const order: any = {};
    if (options?.sort) order[options.sort] = 'ASC';

    const tasks = await this.taskRepo.find({ where, order, relations: ['assignedTo'] });
    this.logAudit(user, 'LIST_TASKS');
    return tasks.map(this.toOutputDto);
  }

  async editTask(userId: number, taskId: number, dto: TaskEditDto) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: ['organization', 'assignedTo'] });
    if (!user || !task) throw new Error('Not found');
    if (!(await this.canEditOrDelete(user, task))) throw new Error('Forbidden');
    Object.assign(task, dto);
    const saved = await this.taskRepo.save(task);
    this.logAudit(user, 'EDIT_TASK', taskId);
    return this.toOutputDto(saved);
  }

  async deleteTask(userId: number, taskId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: ['organization', 'assignedTo'] });
    if (!user || !task) throw new Error('Not found');
    if (!(await this.canEditOrDelete(user, task))) throw new Error('Forbidden');
    await this.taskRepo.delete(taskId);
    this.logAudit(user, 'DELETE_TASK', taskId);
    return { deleted: true };
  }

  async getAuditLog() {
    return this.auditLog;
  }

  async listAllTasks() {
    // Admin: all tasks in the system
    const tasks = await this.taskRepo.find({ relations: ['assignedTo', 'organization'] });
    return tasks.map(this.toOutputDto);
  }

  async listOrgTasks(orgId: number) {
    // Manager: all tasks in their org
    const tasks = await this.taskRepo.find({
      where: { organization: { id: orgId } },
      relations: ['assignedTo', 'organization'],
    });
    return tasks.map(this.toOutputDto);
  }

  async getTask(taskId: number) {
    // Used for access control in controller
    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['assignedTo', 'organization'],
    });
    return task;
  }

  async listCategories(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    if (!user) throw new Error('Forbidden');
    const qb = this.taskRepo.createQueryBuilder('task')
      .select(['task.category'])
      .addSelect(['task.id', 'task.title', 'task.status', 'task.order'])
      .addSelect(['task.description'])
      .addSelect(['task.organizationId', 'task.assignedToId']);
    if (!(await this.hasPermission(user, 'view_task'))) {
      qb.where('task.assignedToId = :userId', { userId: user.id });
    } else {
      qb.where('task.organizationId = :orgId', { orgId: user.organization.id });
    }
    const tasks = await qb.getMany();
    // Group tasks by category
    const result: Record<string, any[]> = {};
    for (const t of tasks) {
      if (!result[t.category]) result[t.category] = [];
      result[t.category].push(t);
    }
    // Return array of { category, tasks }
    return Object.entries(result).map(([category, tasks]) => ({
      category,
      tasks: tasks.map(this.toOutputDto),
    }));
  }

  async updateTaskOrder(userId: number, taskId: number, newOrder: number) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: ['organization', 'assignedTo'] });
    if (!user || !task) throw new Error('Not found');
    //if (!(await this.canEditOrDelete(user, task))) throw new Error('Forbidden');
    task.order = newOrder;
    const saved = await this.taskRepo.save(task);
    this.logAudit(user, 'UPDATE_ORDER', taskId);
    return this.toOutputDto(saved);
  }

  async updateTaskStatus(userId: number, taskId: number, newStatus: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['role', 'organization'] });
    const task = await this.taskRepo.findOne({ where: { id: taskId }, relations: ['organization', 'assignedTo'] });
    if (!user || !task) throw new Error('Not found');
    if (!(await this.canEditOrDelete(user, task))) throw new Error('Forbidden');
    task.status = newStatus;
    const saved = await this.taskRepo.save(task);
    this.logAudit(user, 'UPDATE_STATUS', taskId);
    return this.toOutputDto(saved);
  }

  private async hasPermission(user: User, perm: string) {
    const role = await this.roleRepo.findOne({ where: { id: user.role.id }, relations: ['permissions'] });
    return role?.permissions.some(p => p.name === perm);
  }

  private async canEditOrDelete(user: User, task: Task) {
    // Owner: can edit/delete any org task
    // Admin: can edit any org task (cannot delete)
    // Viewer: only view org and assigned (can only view)    
    if (await this.hasPermission(user, 'edit_task')) {
      return task.organization.id === user.organization.id;
    }
    return task.assignedTo?.id === user.id;
  }

  private logAudit(user: User, action: string, targetId?: number) {
    this.auditLog.push({
      userId: user.id,
      action,
      targetId,
      timestamp: new Date().toISOString(),
    });
  }

  public canAccessTask(user : UserDto, task : Task) : boolean {
    if (!task) return false;    
    if (user.role === 'Admin') return true;
    if (user.role === 'Owner' && user.orgId=== task.organization.id) return true;
    if (user.role === 'Viewer' && user.id === task.assignedTo.id) return true;
    return false;
  }

}
