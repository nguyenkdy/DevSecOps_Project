import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { Address } from './entities/address.entity';

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: jest.Mocked<Repository<User>>;
  let addressRepo: jest.Mocked<Repository<Address>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Address),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    addressRepo = module.get(getRepositoryToken(Address));
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const data = {
      email: 'new@user.com',
      passwordHash: 'hashed',
      fullName: 'Test User',
    };

    it('nên tạo user khi email chưa tồn tại', async () => {
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(data as any);
      userRepo.save.mockResolvedValue({ id: 'uuid-1', ...data } as any);

      const result = await service.create(data);

      expect(result.id).toBe('uuid-1');
      expect(userRepo.save).toHaveBeenCalled();
    });

    it('nên throw ConflictException khi email trùng', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing' } as any);
      await expect(service.create(data)).rejects.toThrow(ConflictException);
      expect(userRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('nên trả về user khi tồn tại', async () => {
      const user = { id: 'uuid-1', email: 'a@a.com' };
      userRepo.findOne.mockResolvedValue(user as any);
      expect(await service.findById('uuid-1')).toEqual(user);
    });

    it('nên throw NotFoundException khi không tồn tại', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toResponse', () => {
    it('nên loại bỏ passwordHash khỏi response', () => {
      const user = {
        id: 'uuid-1',
        email: 'a@a.com',
        passwordHash: 'secret_hash',
        fullName: 'Test',
        phone: null,
        role: UserRole.CUSTOMER,
        createdAt: new Date(),
      } as User;

      const response = service.toResponse(user);

      expect(response).not.toHaveProperty('passwordHash');
      expect(response).toHaveProperty('email', 'a@a.com');
    });
  });

  describe('addAddress', () => {
    it('nên bỏ default cũ khi thêm địa chỉ default mới', async () => {
      const dto = {
        fullName: 'A',
        phone: '0901234567',
        addressLine: '123 Street',
        city: 'HCM',
        isDefault: true,
      };
      addressRepo.create.mockReturnValue({ ...dto, userId: 'uuid-1' } as any);
      addressRepo.save.mockResolvedValue({ id: 'addr-1', ...dto } as any);

      await service.addAddress('uuid-1', dto);

      // Phải reset default của các địa chỉ cũ trước
      expect(addressRepo.update).toHaveBeenCalledWith(
        { userId: 'uuid-1' },
        { isDefault: false },
      );
    });
  });
});
