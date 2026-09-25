import { prisma } from '../../config/database';
import { buildPaginatedResult } from '../../utils/pagination';
import { NotFoundError, ForbiddenError, AppError } from '../../middlewares/errorHandler';
import { ReactionType } from '@prisma/client';
import { HTTP_STATUS, APP } from '../../constants';
import { enqueueNotification } from '../../lib/queue.service';

const commentInclude = {
  author: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } },
  _count: { select: { replies: true, reactions: true } },
};

export class CommentsService {
  async createComment(userId: string, postId: string, content: string, parentId?: string) {
    // Limit nesting depth
    if (parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFoundError('Parent comment not found');
      if (parent.parentId) throw new AppError(`Max comment depth is ${APP.MAX_COMMENT_DEPTH}`, HTTP_STATUS.BAD_REQUEST);
    }

    const comment = await prisma.comment.create({
      data: { postId, authorId: userId, content, parentId },
      include: commentInclude,
    });

    // Notify post author / parent comment author
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== userId) {
      await enqueueNotification({
        userId: post.authorId,
        type: parentId ? 'COMMENT_REPLY' : 'POST_COMMENT',
        title: parentId ? 'New reply' : 'New comment',
        message: `Someone ${parentId ? 'replied to a comment on' : 'commented on'} your post`,
        entityId: postId,
        entityType: 'POST',
      });
    }

    return comment;
  }

  async getPostComments(postId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { postId, parentId: null, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          ...commentInclude,
          replies: {
            where: { deletedAt: null },
            take: 3,
            orderBy: { createdAt: 'asc' },
            include: commentInclude,
          },
        },
      }),
      prisma.comment.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getReplies(commentId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const where = { parentId: commentId, deletedAt: null };
    const [items, total] = await Promise.all([
      prisma.comment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'asc' }, include: commentInclude }),
      prisma.comment.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async updateComment(id: string, userId: string, content: string) {
    const comment = await prisma.comment.findFirst({ where: { id, deletedAt: null } });
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenError('Not your comment');
    return prisma.comment.update({ where: { id }, data: { content, isEdited: true }, include: commentInclude });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await prisma.comment.findFirst({ where: { id, deletedAt: null } });
    if (!comment) throw new NotFoundError('Comment not found');
    if (comment.authorId !== userId) throw new ForbiddenError('Not your comment');
    await prisma.comment.update({ where: { id }, data: { deletedAt: new Date(), content: '[deleted]' } });
  }

  // ─── Reactions ────────────────────────────────────────────────
  async reactToPost(userId: string, postId: string, type: ReactionType) {
    const existing = await prisma.reaction.findFirst({ where: { userId, postId } });
    if (existing) {
      if (existing.type === type) {
        // Toggle off
        await prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed', type };
      }
      // Change reaction
      await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
      return { action: 'changed', type };
    }
    await prisma.reaction.create({ data: { userId, postId, type } });
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    if (post && post.authorId !== userId) {
      await enqueueNotification({
        userId: post.authorId, type: 'POST_REACTION',
        title: 'New reaction', message: `Someone reacted to your post`,
        entityId: postId, entityType: 'POST',
      });
    }
    return { action: 'added', type };
  }

  async reactToComment(userId: string, commentId: string, type: ReactionType) {
    const existing = await prisma.reaction.findFirst({ where: { userId, commentId } });
    if (existing) {
      if (existing.type === type) {
        await prisma.reaction.delete({ where: { id: existing.id } });
        return { action: 'removed', type };
      }
      await prisma.reaction.update({ where: { id: existing.id }, data: { type } });
      return { action: 'changed', type };
    }
    await prisma.reaction.create({ data: { userId, commentId, type } });
    return { action: 'added', type };
  }

  async getPostReactions(postId: string) {
    const reactions = await prisma.reaction.groupBy({
      by: ['type'],
      where: { postId },
      _count: { type: true },
    });
    return reactions.map(r => ({ type: r.type, count: r._count.type }));
  }
}

export const commentsService = new CommentsService();
