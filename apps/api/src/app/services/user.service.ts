import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { Role } from '../models/role.entity';
import { Organization } from '../models/organization.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async validateUser(email: string, password: string): Promise<{ id: number; email: string; role: Role; organization: Organization } | null> {
    const user = await this.userRepo.findOne({
      where: { email, password },
      relations: ['role', 'organization'], 
    });
    if (user) {
      return { id: user.id, email: user.email, role: user.role, organization: user.organization};
    }
    return null;
  }
}
