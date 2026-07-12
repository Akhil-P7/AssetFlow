import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { NotificationsRepository } from './notifications.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: jest.Mocked<NotificationsRepository>;

  const mockActor = {
    id: 'recipient-123',
    role: 'EMPLOYEE',
    departmentId: null,
  };

  const mockRepository = {
    findByRecipient: jest.fn(),
    findOneByIdAndRecipient: jest.fn(),
    save: jest.fn(),
    markAllAsRead: jest.fn(),
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: NotificationsRepository,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get(NotificationsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated notifications for actor', async () => {
      const mockResult = { data: [], total: 0 };
      repository.findByRecipient.mockResolvedValue(mockResult);

      const result = await service.findAll(
        { page: '2', limit: '10', status: 'unread' },
        mockActor,
      );

      expect(result).toEqual(mockResult);
      expect(repository.findByRecipient).toHaveBeenCalledWith(
        'recipient-123',
        'unread',
        2,
        10,
      );
    });

    it('should throw unauthorized error if actor is not provided', async () => {
      await expect(service.findAll({}, null)).rejects.toThrow(ApiError);
    });
  });

  describe('markRead', () => {
    it('should mark an unread notification as read', async () => {
      const mockNotif = {
        id: 'notif-1',
        recipientId: 'recipient-123',
        readAt: null,
      } as any;
      repository.findOneByIdAndRecipient.mockResolvedValue(mockNotif);
      repository.save.mockResolvedValue({ ...mockNotif, readAt: new Date() });

      const result = await service.markRead('notif-1', mockActor);

      expect(result.readAt).toBeInstanceOf(Date);
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw not found error if notification not found for actor', async () => {
      repository.findOneByIdAndRecipient.mockResolvedValue(null);

      await expect(service.markRead('notif-1', mockActor)).rejects.toThrow(
        ApiError,
      );
    });
  });

  describe('markAllRead', () => {
    it('should mark all notifications as read', async () => {
      repository.markAllAsRead.mockResolvedValue(undefined);

      const result = await service.markAllRead(mockActor);

      expect(result).toEqual({ success: true });
      expect(repository.markAllAsRead).toHaveBeenCalledWith('recipient-123');
    });
  });

  describe('create', () => {
    it('should delegate creation to repository', async () => {
      const mockNotif = { id: 'notif-1' } as any;
      repository.createNotification.mockResolvedValue(mockNotif);

      const result = await service.create('recipient-123', 'ASSET_ASSIGNED', {
        assetTag: 'AF-100',
      });

      expect(result).toEqual(mockNotif);
      expect(repository.createNotification).toHaveBeenCalledWith(
        'recipient-123',
        'ASSET_ASSIGNED',
        { assetTag: 'AF-100' },
        undefined,
      );
    });
  });
});
