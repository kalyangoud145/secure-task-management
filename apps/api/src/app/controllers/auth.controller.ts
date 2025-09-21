import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';
import { UserDto } from '@secure-task-mangement/data';

@Controller()
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('/auth/login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
    const user = await this.userService.validateUser(email, password);
    if (user) {
      const payload : UserDto = { 
        id: user.id, 
        email: user.email,
        role: user.role.name,
        orgId: user.organization.id
      };
      const token = jwt.sign(payload, process.env['JWT_SECRET'] || 'your_jwt_secret', { expiresIn: '1h' });
      return { access_token: token };
    }
    throw new UnauthorizedException('Invalid credentials');
  }
}
