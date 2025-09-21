import { CanActivate, ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";


export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflectRoles(context);
    if (!roles || roles.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.role) throw new UnauthorizedException('No user role');
    const roleHierarchy = ['Viewer', 'Admin', 'Owner'];
    const userRoleIdx = roleHierarchy.indexOf(user.role);
    return roles.some(role => userRoleIdx >= roleHierarchy.indexOf(role));
  }
  private reflectRoles(context: ExecutionContext): string[] {
    return context.getHandler() && Reflect.getMetadata(ROLES_KEY, context.getHandler());
  }
}
