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
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
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

  describe('listAddresses', () => {
    it('nên trả về danh sách địa chỉ của user', async () => {
      const addresses = [{ id: 'addr-1', userId: 'uuid-1' }];
      addressRepo.find.mockResolvedValue(addresses as any);

      const result = await service.listAddresses('uuid-1');

      expect(result).toEqual(addresses);
      expect(addressRepo.find).toHaveBeenCalledWith({
        where: { userId: 'uuid-1' },
        order: { isDefault: 'DESC', createdAt: 'DESC' },
      });
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

      expect(addressRepo.update).toHaveBeenCalledWith(
        { userId: 'uuid-1' },
        { isDefault: false },
      );
    });

    it('nên không gọi update khi isDefault=false', async () => {
      const dto = { fullName: 'B', phone: '0901234567', addressLine: '456 St', city: 'HN', isDefault: false };
      addressRepo.create.mockReturnValue({ ...dto, userId: 'uuid-1' } as any);
      addressRepo.save.mockResolvedValue({ id: 'addr-2', ...dto } as any);

      await service.addAddress('uuid-1', dto);

      expect(addressRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('updateAddress', () => {
    it('nên throw NotFoundException khi địa chỉ không tồn tại', async () => {
      addressRepo.findOne.mockResolvedValue(null);
      await expect(service.updateAddress('uuid-1', 'addr-99', {} as any)).rejects.toThrow(NotFoundException);
    });

    it('nên cập nhật địa chỉ và reset default cũ khi isDefault=true', async () => {
      const existing = { id: 'addr-1', userId: 'uuid-1', isDefault: false };
      addressRepo.findOne.mockResolvedValue(existing as any);
      addressRepo.save.mockResolvedValue({ ...existing, isDefault: true } as any);

      await service.updateAddress('uuid-1', 'addr-1', { isDefault: true } as any);

      expect(addressRepo.update).toHaveBeenCalledWith({ userId: 'uuid-1' }, { isDefault: false });
      expect(addressRepo.save).toHaveBeenCalled();
    });

    it('nên cập nhật địa chỉ mà không reset default khi isDefault=false', async () => {
      const existing = { id: 'addr-1', userId: 'uuid-1', fullName: 'Old' };
      addressRepo.findOne.mockResolvedValue(existing as any);
      addressRepo.save.mockResolvedValue({ ...existing, fullName: 'New' } as any);

      await service.updateAddress('uuid-1', 'addr-1', { fullName: 'New' } as any);

      expect(addressRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAddress', () => {
    it('nên throw NotFoundException khi địa chỉ không tồn tại', async () => {
      addressRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteAddress('uuid-1', 'addr-99')).rejects.toThrow(NotFoundException);
    });

    it('nên xóa địa chỉ khi tồn tại', async () => {
      const existing = { id: 'addr-1', userId: 'uuid-1' };
      addressRepo.findOne.mockResolvedValue(existing as any);
      addressRepo.remove.mockResolvedValue(undefined as any);

      await service.deleteAddress('uuid-1', 'addr-1');

      expect(addressRepo.remove).toHaveBeenCalledWith(existing);
    });
  });
});
