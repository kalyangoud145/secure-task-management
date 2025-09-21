import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtGuard } from './jwt.guard';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('JwtGuard', () => {
  let jwtGuard: JwtGuard;
  let mockExecutionContext: ExecutionContext;
  let mockRequest: any;

  beforeEach(() => {
    jwtGuard = new JwtGuard();
    mockRequest = {
      headers: {}
    };
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(mockRequest)
      })
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(jwtGuard).toBeDefined();
  });

  it('should return true for valid token', () => {
    const mockPayload = { userId: '123', email: 'test@example.com' };
    mockRequest.headers['authorization'] = 'Bearer valid-token';
    (jwt.verify as jest.Mock).mockReturnValue(mockPayload);

    const result = jwtGuard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'jwt_secret_value');
  });

  it('should throw UnauthorizedException when authorization header is missing', () => {
    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow('Missing Authorization header');
  });

  it('should throw UnauthorizedException when token is missing', () => {
    mockRequest.headers['authorization'] = 'Bearer ';

    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow('Missing token');
  });

  it('should throw UnauthorizedException when token is invalid', () => {
    mockRequest.headers['authorization'] = 'Bearer invalid-token';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
    expect(() => jwtGuard.canActivate(mockExecutionContext)).toThrow('Invalid token');
  });

  it('should use JWT_SECRET from environment variables', () => {
    const originalEnv = process.env['JWT_SECRET'];
    process.env['JWT_SECRET'] = 'custom-secret';
    mockRequest.headers['authorization'] = 'Bearer test-token';
    (jwt.verify as jest.Mock).mockReturnValue({ userId: '123' });

    jwtGuard.canActivate(mockExecutionContext);

    expect(jwt.verify).toHaveBeenCalledWith('test-token', 'custom-secret');
    process.env['JWT_SECRET'] = originalEnv;
  });
});
