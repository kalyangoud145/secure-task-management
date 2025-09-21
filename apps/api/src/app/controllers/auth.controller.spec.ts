import { AuthController } from './auth.controller';
import { UserService } from '../services/user.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let userService: UserService;

  beforeEach(() => {
    userService = {
      validateUser: jest.fn(),
    } as any;
    authController = new AuthController(userService);
    process.env['JWT_SECRET'] = 'test_secret';
  });

  it('should return access_token for valid credentials', async () => {
    (userService.validateUser as jest.Mock).mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      role: { name: 'admin' },
      organization: { id: 123 }
    });

    const result = await authController.login({ email: 'test@example.com', password: 'password' });
    expect(result).toHaveProperty('access_token');
    expect(typeof result.access_token).toBe('string');
  });

  it('should throw UnauthorizedException for invalid credentials', async () => {
    (userService.validateUser as jest.Mock).mockResolvedValue(null);

    await expect(
      authController.login({ email: 'wrong@example.com', password: 'wrongpass' })
    ).rejects.toThrow(UnauthorizedException);
  });
});
