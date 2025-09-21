import { Controller, Post, Get, Put, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { TaskService } from '../services/task.service';
import { JwtGuard, RolesGuard, Roles } from '@secure-task-mangement/auth';
import {
  TaskInputDto,
  TaskEditDto,
  TaskOrderUpdateDto,
  TaskStatusUpdateDto
} from '@secure-task-mangement/data';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('/task')
  @Roles('Owner', 'Admin')
  async createTask(@Req() req, @Body() dto: TaskInputDto) {
    return this.taskService.createTask(req.user.id, dto);
  }

  @Get('/tasks')
  @Roles('Viewer', 'Owner', 'Admin')
  async listTasks(@Req() req) {
    const { id, role, orgId } = req.user;
    const { sort, category, status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    let tasks = [];
    if (role === 'Admin') {
      tasks = await this.taskService.listAllTasks();
    } else if (role === 'Owner') {
      tasks = await this.taskService.listOrgTasks(orgId);
    } else {
      tasks = await this.taskService.listTasks(id, { sort, filter, category });
    }    
    return tasks;
  }

  @Get('/tasks-by-categories')
  @Roles('Viewer', 'Owner', 'Admin')
  async listCategories(@Req() req) {
    return this.taskService.listCategories(req.user.id);
  }

  @Put('/task/:id/order')
  @Roles('Owner', 'Admin')
  async updateOrder(@Req() req, @Param('id') id: number, @Body() body: TaskOrderUpdateDto) {
    const { order } = body;
    return this.taskService.updateTaskOrder(req.user.id, id, order);
  }

  @Put('/task/:id/status')
  @Roles('Owner', 'Admin')
  async updateStatus(@Req() req, @Param('id') id: number, @Body() body: TaskStatusUpdateDto) {
    const { status } = body;    
    return this.taskService.updateTaskStatus(req.user.id, id, status);
  }

  @Put('/editTask/:id')
  @Roles('Owner', 'Admin')
  async editTask(@Req() req, @Param('id') id: number, @Body() dto: TaskEditDto) {
    const task = await this.taskService.getTask(id);
    if (!this.taskService.canAccessTask(req.user, task)) throw new Error('Forbidden');
    return this.taskService.editTask(req.user.id, id, dto);
  }

  @Delete('/deleteTask/:id')
  @Roles('Owner', 'Admin')
  async deleteTask(@Req() req, @Param('id') id: number) {
    const task = await this.taskService.getTask(id);        
    if (!this.taskService.canAccessTask(req.user, task)) throw new Error('Forbidden');
    return this.taskService.deleteTask(req.user.id, id);
  }

  @Get('/audit-log')
  @Roles('Owner', 'Admin')
  async getAuditLog() {
    return this.taskService.getAuditLog();
  }
}
