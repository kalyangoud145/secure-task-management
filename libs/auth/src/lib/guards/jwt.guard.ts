import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader) throw new UnauthorizedException('Missing Authorization header');
    const token = authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = jwt.verify(token, process.env['JWT_SECRET'] || 'jwt_secret_value');
      request.user = payload;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
