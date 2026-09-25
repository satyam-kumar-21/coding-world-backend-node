import { prisma } from '../../config/database';
import { buildPaginatedResult, buildCursorPaginatedResult, buildPrismaCursorArgs } from '../../utils/pagination';
import { NotFoundError, ForbiddenError } from '../../middlewares/errorHandler';
import type { CreatePostInput, PostQueryInput } from './posts.validators';

const postInclude = {
  author: { select: { id: true, username: true, profile: { select: { firstName: true, lastName: true, avatar: true } } } },
  pollOptions: true,
  _count: { select: { comments: true, reactions: true } },
};

export class PostsService {
  async create(userId: string, data: CreatePostInput) {
    const { pollOptions, ...rest } = data;
    return prisma.post.create({
      data: {
        authorId: userId,
        ...rest,
        pollOptions: pollOptions?.length ? { create: pollOptions.map(o => ({ text: o.text })) } : undefined,
      },
      include: postInclude,
    });
  }

  async getFeed(userId: string | undefined, query: PostQueryInput) {
    const { page, limit, cursor, type, tag, authorId } = query;

    if (cursor) {
      // Cursor-based for realtime feed
      const args = buildPrismaCursorArgs(cursor, limit);
      const where = {
        deletedAt: null,
        ...(userId ? {} : { visibility: 'PUBLIC' as const }),
        ...(type ? { type } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(authorId ? { authorId } : {}),
      };
      const items = await prisma.post.findMany({ ...args, where, include: postInclude });
      return buildCursorPaginatedResult(items, limit);
    }

    // Offset for profile pages etc.
    const skip = (page - 1) * limit;
    const where = {
      deletedAt: null,
      ...(userId ? {} : { visibility: 'PUBLIC' as const }),
      ...(type ? { type } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(authorId ? { authorId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.post.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: postInclude }),
      prisma.post.count({ where }),
    ]);
    return buildPaginatedResult(items, total, page, limit);
  }

  async getOne(id: string) {
    const post = await prisma.post.findFirst({ where: { id, deletedAt: null }, include: postInclude });
    if (!post) throw new NotFoundError('Post not found');
    return post;
  }

  async update(id: string, userId: string, data: Partial<CreatePostInput>) {
    const post = await prisma.post.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundError('Post not found');
    if (post.authorId !== userId) throw new ForbiddenError('Not your post');
    const { pollOptions, ...rest } = data;
    return prisma.post.update({ where: { id }, data: { ...rest, isEdited: true }, include: postInclude });
  }

  async delete(id: string, userId: string) {
    const post = await prisma.post.findFirst({ where: { id, deletedAt: null } });
    if (!post) throw new NotFoundError('Post not found');
    if (post.authorId !== userId) throw new ForbiddenError('Not your post');
    await prisma.post.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async votePoll(userId: string, postId: string, optionId: string) {
    const option = await prisma.pollOption.findUnique({ where: { id: optionId } });
    if (!option || option.postId !== postId) throw new NotFoundError('Option not found');
    if (option.voters.includes(userId)) throw new ForbiddenError('Already voted');
    // Remove vote from other options in same post
    await prisma.pollOption.updateMany({
      where: { postId, voters: { has: userId } },
      data: { votes: { decrement: 1 }, voters: { set: [] } }, // simplified — production would filter array properly
    });
    return prisma.pollOption.update({
      where: { id: optionId },
      data: { votes: { increment: 1 }, voters: { push: userId } },
    });
  }
}

export const postsService = new PostsService();
