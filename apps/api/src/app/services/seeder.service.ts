import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../models/organization.entity';
import { Role } from '../models/role.entity';
import { Permission } from '../models/permission.entity';
import { User } from '../models/user.entity';
import { Task } from '../models/task.entity';

@Injectable()
export class SeederService {
  constructor(
    @InjectRepository(Organization) private orgRepo: Repository<Organization>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
  ) {}

  async seed() {
    // Seed Organizations (2-level hierarchy)
    let parentOrg = await this.orgRepo.findOne({ where: { name: 'ParentOrg' } });
    if (!parentOrg) {
      parentOrg = await this.orgRepo.save({ name: 'ParentOrg' });
    }
    let childOrg = await this.orgRepo.findOne({ where: { name: 'ChildOrg' } });
    if (!childOrg) {
      childOrg = await this.orgRepo.save({ name: 'ChildOrg', parent: parentOrg });
    }

    // Seed Roles
    const roleNames = ['Owner', 'Admin', 'Viewer'];
    const roles = [];
    for (const name of roleNames) {
      let role = await this.roleRepo.findOne({ where: { name } });
      if (!role) {
        role = await this.roleRepo.save({ name });
      }
      roles.push(role);
    }

    // Seed Permissions
    const permNames = ['create_task', 'edit_task', 'delete_task', 'view_task'];
    const permissions = [];
    for (const name of permNames) {
      let perm = await this.permRepo.findOne({ where: { name } });
      if (!perm) {
        perm = await this.permRepo.save({ name });
      }
      permissions.push(perm);
    }

    // Assign all permissions to Owner, some to Admin, one to Viewer
    await this.roleRepo.save({
      ...roles[0],
      permissions: permissions,
    });
    await this.roleRepo.save({
      ...roles[1],
      permissions: permissions.filter(p => p.name !== 'delete_task'),
    });
    await this.roleRepo.save({
      ...roles[2],
      permissions: permissions.filter(p => p.name === 'view_task'),
    });

    // Seed Users
    const users = [
      { email: 'owner@org.com', password: 'pass', organization: parentOrg, role: roles[0] },
      { email: 'admin@org.com', password: 'pass', organization: childOrg, role: roles[1] },
      { email: 'viewer@org.com', password: 'pass', organization: childOrg, role: roles[2] },
    ];
    for (const u of users) {
      const user = await this.userRepo.findOne({ where: { email: u.email } });
      if (!user) {
        await this.userRepo.save(u);
      }
    }

    // Seed Tasks
    const assignedUser = await this.userRepo.findOne({ where: { email: 'admin@org.com' } });
    if (assignedUser) {
      // Seed multiple tasks with categories, status, and order
      const tasksToSeed = [
        {
          title: 'Sample Task',
          description: 'This is a seeded task.',
          category: 'Work',
          status: 'Todo',
          order: 1,
          assignedTo: assignedUser,
          organization: childOrg,
        },
        {
          title: 'Personal Errand',
          description: 'Buy groceries.',
          category: 'Personal',
          status: 'InProgress',
          order: 2,
          assignedTo: assignedUser,
          organization: childOrg,
        },
        {
          title: 'Finish Report',
          description: 'Complete the quarterly report.',
          category: 'Work',
          status: 'Done',
          order: 3,
          assignedTo: assignedUser,
          organization: childOrg,
        },
      ];
      for (const t of tasksToSeed) {
        const existing = await this.taskRepo.findOne({ where: { title: t.title } });
        if (!existing) {
          await this.taskRepo.save(t);
        }
      }
    }
  }
}
