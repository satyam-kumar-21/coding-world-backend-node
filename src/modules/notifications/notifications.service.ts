import { prisma } from '../../config/database';
import { buildCursorPaginatedResult, buildPrismaCursorArgs } from '../../utils/pagination';
import { NotificationJobData } from '../../lib/queue.service';

export class NotificationsService {
  async create(data: NotificationJobData) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type as never,
        title: data.title,
        message: data.message,
        entityType: data.entityType,
        entityId: data.entityId,
        data: data.data as never,
      },
    });
  }

  async getNotifications(userId: string, cursor?: string, limit = 20) {
    const args = buildPrismaCursorArgs(cursor, limit);
    const items = await prisma.notification.findMany({
      ...args,
      where: { userId },
    });
    return buildCursorPaginatedResult(items, limit);
  }

  async markRead(userId: string, notificationId: string) {
    return prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async deleteNotification(userId: string, id: string) {
    await prisma.notification.deleteMany({ where: { id, userId } });
  }

  async getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } });
  }
}

export const notificationsService = new NotificationsService();
