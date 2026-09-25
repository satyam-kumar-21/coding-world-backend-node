import { prisma } from '../../config/database';
import { buildCursorPaginatedResult, buildPrismaCursorArgs, buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import { MessageType } from '@prisma/client';
import { storageService, generateStorageKey } from '../../lib/storage.service';

export class ChatService {
  // ─── Conversations ────────────────────────────────────────────
  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    // Find existing direct conversation
    const existing = await prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        members: { every: { userId: { in: [userId, targetUserId] } } },
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: conversationInclude,
    });
    if (existing) return existing;

    return prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: { create: [{ userId }, { userId: targetUserId }] },
      },
      include: conversationInclude,
    });
  }

  async createGroupConversation(userId: string, name: string, memberIds: string[]) {
    const allMembers = [...new Set([userId, ...memberIds])];
    return prisma.conversation.create({
      data: {
        type: 'GROUP',
        name,
        createdById: userId,
        members: { create: allMembers.map((id, i) => ({ userId: id, role: i === 0 ? 'OWNER' : 'MEMBER' })) },
      },
      include: conversationInclude,
    });
  }

  async getUserConversations(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { members: { some: { userId, leftAt: null } }, isActive: true };
    const [items, total] = await Promise.all([
      prisma.conversation.findMany({
        where, skip, take: limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          ...conversationInclude,
          messages: { take: 1, orderBy: { createdAt: 'desc' }, where: { deletedAt: null } },
        },
      }),
      prisma.conversation.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundError('Conversation not found');
    const isMember = conversation.members.some(m => m.userId === userId && !m.leftAt);
    if (!isMember) throw new ForbiddenError('Not a member');
    return conversation;
  }

  // ─── Messages ─────────────────────────────────────────────────
  async sendMessage(conversationId: string, senderId: string, data: {
    type?: MessageType;
    content?: string;
    replyToId?: string;
  }) {
    await this.assertMember(conversationId, senderId);

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: data.type ?? MessageType.TEXT,
        content: data.content,
        replyToId: data.replyToId,
      },
      include: messageInclude,
    });

    await prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return message;
  }

  async sendFileMessage(conversationId: string, senderId: string, file: Express.Multer.File) {
    await this.assertMember(conversationId, senderId);
    const key = generateStorageKey('chat', senderId, file.originalname);
    const result = await storageService.upload(key, file.buffer, file.mimetype, false);

    return prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: MessageType.FILE,
        fileUrl: result.url,
        fileName: file.originalname,
        fileSize: BigInt(file.size),
      },
      include: messageInclude,
    });
  }

  async getMessages(conversationId: string, userId: string, cursor?: string, limit = 30) {
    await this.assertMember(conversationId, userId);
    const args = buildPrismaCursorArgs(cursor, limit);
    const items = await prisma.message.findMany({
      ...args,
      where: { conversationId, deletedAt: null },
      include: messageInclude,
    });
    return buildCursorPaginatedResult(items, limit);
  }

  async editMessage(messageId: string, userId: string, content: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenError('Not your message');
    return prisma.message.update({ where: { id: messageId }, data: { content, isEdited: true }, include: messageInclude });
  }

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new NotFoundError('Message not found');
    if (msg.senderId !== userId) throw new ForbiddenError('Not your message');
    await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date(), content: null } });
  }

  async markRead(conversationId: string, userId: string, messageId: string) {
    await prisma.messageRead.upsert({
      where: { messageId_userId: { messageId, userId } },
      create: { messageId, userId },
      update: { readAt: new Date() },
    });
    await prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: { lastReadAt: new Date() },
    });
  }

  private async assertMember(conversationId: string, userId: string) {
    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!member || member.leftAt) throw new ForbiddenError('Not a member of this conversation');
  }
}

const conversationInclude = {
  members: {
    where: { leftAt: null },
    include: { user: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true, isOnline: true } } } } },
  },
};

const messageInclude = {
  sender: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } },
  replyTo: { select: { id: true, content: true, senderId: true } },
  readBy: { select: { userId: true, readAt: true } },
};

export const chatService = new ChatService();
