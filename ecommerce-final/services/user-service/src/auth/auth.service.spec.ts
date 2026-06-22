import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RedisService } from '../common/redis.service';
import { EventPublisherService } from '../common/event-publisher.service';
import { UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let redis: jest.Mocked<RedisService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const values = {
        'jwt.accessSecret': 'test_access_secret',
        'jwt.refreshSecret': 'test_refresh_secret',
        'jwt.accessExpires': '15m',
        'jwt.refreshExpires': '7d',
      };
      return values[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findByEmailWithPassword: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
            verifyAsync: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: mockConfig },
        {
          provide: RedisService,
          useValue: {
            storeRefreshToken: jest.fn(),
            isRefreshTokenValid: jest.fn(),
            revokeRefreshToken: jest.fn(),
          },
        },
        {
          provide: EventPublisherService,
          useValue: { publishUserRegistered: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    redis = module.get(RedisService);
    eventPublisher = module.get(EventPublisherService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const dto = {
      email: 'new@user.com',
      password: 'P@ssword123',
      fullName: 'Nguyen Van A',
    };

    it('nên hash password và tạo user mới', async () => {
      const createdUser = {
        id: 'uuid-1',
        email: dto.email,
        fullName: dto.fullName,
        role: UserRole.CUSTOMER,
      };
      usersService.create.mockResolvedValue(createdUser as any);

      const result = await service.register(dto);

      // Password phải được hash, không lưu plaintext
      const createArg = usersService.create.mock.calls[0][0];
      expect(createArg.passwordHash).not.toBe(dto.password);
      const isHashed = await bcrypt.compare(dto.password, createArg.passwordHash);
      expect(isHashed).toBe(true);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(dto.email);
    });

    it('nên publish event user.registered', async () => {
      usersService.create.mockResolvedValue({
        id: 'uuid-1',
        email: dto.email,
        fullName: dto.fullName,
        role: UserRole.CUSTOMER,
      } as any);

      await service.register(dto);

      expect(eventPublisher.publishUserRegistered).toHaveBeenCalledWith({
        userId: 'uuid-1',
        email: dto.email,
        fullName: dto.fullName,
      });
    });

    it('nên throw ConflictException khi email đã tồn tại', async () => {
      usersService.create.mockRejectedValue(
        new ConflictException('Email đã được đăng ký'),
      );
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const password = 'P@ssword123';
    let userWithHash: any;

    beforeEach(async () => {
      userWithHash = {
        id: 'uuid-1',
        email: 'test@user.com',
        passwordHash: await bcrypt.hash(password, 10),
        fullName: 'Test User',
        role: UserRole.CUSTOMER,
        isActive: true,
      };
    });

    it('nên trả về tokens khi credentials đúng', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(userWithHash);

      const result = await service.login({ email: 'test@user.com', password });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(redis.storeRefreshToken).toHaveBeenCalled();
    });

    it('nên throw UnauthorizedException khi user không tồn tại', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);
      await expect(
        service.login({ email: 'ghost@user.com', password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên throw UnauthorizedException khi password sai', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(userWithHash);
      await expect(
        service.login({ email: 'test@user.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('nên throw UnauthorizedException khi tài khoản bị khoá', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        ...userWithHash,
        isActive: false,
      });
      await expect(
        service.login({ email: 'test@user.com', password }),
      ).rejects.toThrow('Tài khoản đã bị khoá');
    });
  });

  describe('refresh', () => {
    it('nên cấp token mới khi refresh token hợp lệ', async () => {
      const jwtService = service['jwtService'] as jest.Mocked<JwtService>;
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'uuid-1',
        email: 'test@user.com',
        role: UserRole.CUSTOMER,
        jti: 'token-id-1',
      } as any);
      redis.isRefreshTokenValid.mockResolvedValue(true);

      const result = await service.refresh('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
      // Token rotation: token cũ phải bị revoke
      expect(redis.revokeRefreshToken).toHaveBeenCalledWith('uuid-1', 'token-id-1');
    });

    it('nên throw khi refresh token đã bị thu hồi', async () => {
      const jwtService = service['jwtService'] as jest.Mocked<JwtService>;
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'uuid-1',
        jti: 'revoked-token',
      } as any);
      redis.isRefreshTokenValid.mockResolvedValue(false);

      await expect(service.refresh('revoked.token')).rejects.toThrow(
        'Refresh token đã bị thu hồi',
      );
    });

    it('nên throw khi refresh token invalid', async () => {
      const jwtService = service['jwtService'] as jest.Mocked<JwtService>;
      jwtService.verifyAsync.mockRejectedValue(new Error('invalid'));

      await expect(service.refresh('garbage.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
