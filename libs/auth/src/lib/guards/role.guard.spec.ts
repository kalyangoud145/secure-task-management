import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, ROLES_KEY } from './role.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    guard = new RolesGuard();
    mockRequest = {
      user: null
    };
    
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      }),
      getHandler: jest.fn()
    } as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('canActivate', () => {
    it('should return true when no roles are required', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(undefined);
      
      const result = guard.canActivate(mockExecutionContext);
      
      expect(result).toBe(true);
    });

    it('should return true when empty roles array is provided', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue([]);
      
      const result = guard.canActivate(mockExecutionContext);
      
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException when user is not present', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
      mockRequest.user = null;
      
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('No user role');
    });

    it('should throw UnauthorizedException when user has no role', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
      mockRequest.user = { id: 1, name: 'Test User' };
      
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow('No user role');
    });

    describe('Role Hierarchy Tests', () => {
      it('should allow Owner to access Owner-only resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Owner']);
        mockRequest.user = { role: 'Owner' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should allow Owner to access Admin resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
        mockRequest.user = { role: 'Owner' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should allow Owner to access Viewer resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Viewer']);
        mockRequest.user = { role: 'Owner' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should allow Admin to access Admin resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
        mockRequest.user = { role: 'Admin' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should allow Admin to access Viewer resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Viewer']);
        mockRequest.user = { role: 'Admin' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should deny Admin access to Owner resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Owner']);
        mockRequest.user = { role: 'Admin' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(false);
      });

      it('should allow Viewer to access Viewer resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Viewer']);
        mockRequest.user = { role: 'Viewer' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(true);
      });

      it('should deny Viewer access to Admin resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
        mockRequest.user = { role: 'Viewer' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(false);
      });

      it('should deny Viewer access to Owner resources', () => {
        jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Owner']);
        mockRequest.user = { role: 'Viewer' };
        
        const result = guard.canActivate(mockExecutionContext);
        
        expect(result).toBe(false);
      });
    });

    it('should handle multiple required roles correctly', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin', 'Owner']);
      
      // With multiple roles, user needs to have at least one of them
      mockRequest.user = { role: 'Admin' };
      expect(guard.canActivate(mockExecutionContext)).toBe(true);
      
      mockRequest.user = { role: 'Owner' };
      expect(guard.canActivate(mockExecutionContext)).toBe(true);
      
      // Viewer (index 0) checking against Admin (index 1) and Owner (index 2)
      // 0 >= 1? No, 0 >= 2? No, so should be false
      mockRequest.user = { role: 'Viewer' };
      expect(guard.canActivate(mockExecutionContext)).toBe(false);
    });

    it('should handle invalid role gracefully', () => {
      jest.spyOn(guard as any, 'reflectRoles').mockReturnValue(['Admin']);
      mockRequest.user = { role: 'InvalidRole' };
      
      // Invalid role returns -1 from indexOf, so -1 >= 1 is false
      const result = guard.canActivate(mockExecutionContext);
      
      expect(result).toBe(false);
    });
  });

  describe('reflectRoles', () => {
    it('should return roles when handler exists', () => {
      const expectedRoles = ['Admin', 'Owner'];
      const mockGetMetadata = jest.spyOn(Reflect, 'getMetadata');
      mockGetMetadata.mockReturnValue(expectedRoles);
      const mockHandler = {};
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(mockHandler);
      
      const result = (guard as any).reflectRoles(mockExecutionContext);
      
      expect(result).toEqual(expectedRoles);
      expect(Reflect.getMetadata).toHaveBeenCalledWith(ROLES_KEY, mockHandler);
    });

    it('should return undefined when handler does not exist', () => {
      mockExecutionContext.getHandler = jest.fn().mockReturnValue(null);
      
      const result = (guard as any).reflectRoles(mockExecutionContext);
      
      // Based on the implementation: return context.getHandler() && Reflect.getMetadata(...)
      // When handler is null, it returns null (not undefined)
      expect(result).toBeFalsy();
    });
  });
});
