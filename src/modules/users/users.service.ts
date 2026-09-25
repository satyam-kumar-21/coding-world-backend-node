import { usersRepository } from './users.repository';
import { storageService, generateStorageKey } from '../../lib/storage.service';
import { redisService } from '../../lib/redis.service';
import { prisma } from '../../config/database';
import { REDIS_KEYS, CACHE_TTL } from '../../constants';
import { NotFoundError, ConflictError } from '../../middlewares/errorHandler';
import { buildPaginatedResult } from '../../utils/pagination';
import type { UpdateProfileInput, UpdatePrivacyInput, AddEducationInput } from './users.validators';

export class UsersService {
  async getUserByUsername(username: string) {
    const cacheKey = `user:username:${username}`;
    const cached = await redisService.getJson(cacheKey);
    if (cached) return cached;

    const user = await usersRepository.findByUsername(username);
    if (!user) throw new NotFoundError('User not found');

    await redisService.setJson(cacheKey, user, CACHE_TTL.USER_PROFILE);
    return user;
  }

  async getUserById(userId: string) {
    const cacheKey = REDIS_KEYS.USER_CACHE(userId);
    const cached = await redisService.getJson(cacheKey);
    if (cached) return cached;

    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError('User not found');

    await redisService.setJson(cacheKey, user, CACHE_TTL.USER_PROFILE);
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    await usersRepository.updateProfile(userId, data);
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));
    return usersRepository.findById(userId);
  }

  async updateUsername(userId: string, username: string) {
    const result = await usersRepository.updateUsername(userId, username);
    if (!result) throw new ConflictError('Username is already taken');
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));
    return result;
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const key = generateStorageKey('avatars', userId, file.originalname);
    const result = await storageService.upload(key, file.buffer, file.mimetype, true);

    // Save file record
    const fileRecord = await prisma.fileResource.create({
      data: {
        uploadedById: userId,
        fileName: key.split('/').pop() ?? key,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: BigInt(file.size),
        storageKey: key,
        url: result.url,
        resourceType: 'IMAGE',
        bucket: result.bucket,
        isPublic: true,
      },
    });

    await usersRepository.updateAvatar(userId, result.url, fileRecord.id);
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));

    return { avatarUrl: result.url };
  }

  async updatePrivacy(userId: string, data: UpdatePrivacyInput) {
    await usersRepository.updatePrivacy(userId, data);
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));
  }

  async addEducation(userId: string, data: AddEducationInput) {
    const education = await usersRepository.addEducation(userId, data);
    if (!education) throw new NotFoundError('Profile not found');
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));
    return education;
  }

  async deleteEducation(userId: string, educationId: string) {
    await usersRepository.deleteEducation(userId, educationId);
    await redisService.del(REDIS_KEYS.USER_CACHE(userId));
  }

  async getUserStats(userId: string) {
    return usersRepository.getUserStats(userId);
  }

  async listUsers(params: {
    page: number;
    limit: number;
    search?: string;
    skill?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { users, total } = await usersRepository.listUsers(params);
    return buildPaginatedResult(users, total, params.page, params.limit);
  }
}

export const usersService = new UsersService();
