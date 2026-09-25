// ─── HTTP Status ─────────────────────────────────────────────────────────────
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ─── JWT ─────────────────────────────────────────────────────────────────────
export const JWT = {
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
  EMAIL_VERIFY_EXPIRES_IN: '24h',
  PASSWORD_RESET_EXPIRES_IN: '1h',
  COOKIE_NAME: 'cw_refresh_token',
} as const;

// ─── Pagination ───────────────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  CURSOR_LIMIT: 20,
} as const;

// ─── Cache TTL (seconds) ─────────────────────────────────────────────────────
export const CACHE_TTL = {
  SHORT: 60,         // 1 minute
  MEDIUM: 300,       // 5 minutes
  LONG: 3600,        // 1 hour
  VERY_LONG: 86400,  // 24 hours
  USER_PROFILE: 300,
  COURSE_LIST: 120,
  RANKINGS: 300,
  LIVE_DEVELOPERS: 30,
} as const;

// ─── Redis Keys ───────────────────────────────────────────────────────────────
export const REDIS_KEYS = {
  USER_SESSION: (userId: string) => `session:${userId}`,
  USER_ONLINE: (userId: string) => `online:${userId}`,
  LIVE_DEVELOPERS: 'live:developers',
  LEADERBOARD_GLOBAL: 'leaderboard:global',
  LEADERBOARD_WEEKLY: 'leaderboard:weekly',
  LEADERBOARD_MONTHLY: 'leaderboard:monthly',
  RATE_LIMIT: (key: string) => `rl:${key}`,
  EMAIL_VERIFY_TOKEN: (token: string) => `ev:${token}`,
  PASSWORD_RESET_TOKEN: (token: string) => `pr:${token}`,
  REFRESH_TOKEN_BLACKLIST: (token: string) => `rtb:${token}`,
  COURSE_CACHE: (courseId: string) => `course:${courseId}`,
  USER_CACHE: (userId: string) => `user:${userId}`,
  SOCKET_USER: (userId: string) => `socket:user:${userId}`,
  TYPING: (conversationId: string, userId: string) => `typing:${conversationId}:${userId}`,
} as const;

// ─── Queue Names ─────────────────────────────────────────────────────────────
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  CODE_EXECUTION: 'code-execution',
  LEADERBOARD: 'leaderboard',
  CERTIFICATES: 'certificates',
  CLEANUP: 'cleanup',
  XP_UPDATE: 'xp-update',
} as const;

// ─── Socket Events ────────────────────────────────────────────────────────────
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',

  // User presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Typing
  USER_TYPING: 'user:typing',
  USER_STOP_TYPING: 'user:stopTyping',

  // Messages
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_UPDATED: 'message:updated',
  MESSAGE_DELETED: 'message:deleted',

  // Connections
  CONNECTION_REQUEST: 'connection:request',
  CONNECTION_ACCEPTED: 'connection:accepted',
  CONNECTION_REJECTED: 'connection:rejected',

  // Notifications
  NOTIFICATION_NEW: 'notification:new',

  // Live
  LIVE_JOIN: 'live:join',
  LIVE_LEAVE: 'live:leave',
  LIVE_UPDATE: 'live:update',
  LIVE_DEVELOPERS: 'live:developers',

  // Collaboration
  COLLABORATION_REQUEST: 'collaboration:request',
  COLLABORATION_ACCEPTED: 'collaboration:accepted',
  COLLABORATION_REJECTED: 'collaboration:rejected',
  SESSION_JOINED: 'session:joined',
  SESSION_LEFT: 'session:left',
  SESSION_ENDED: 'session:ended',
  SESSION_MESSAGE: 'session:message',

  // Submissions
  SUBMISSION_RESULT: 'submission:result',

  // Rooms
  JOIN_ROOM: 'joinRoom',
  LEAVE_ROOM: 'leaveRoom',

  // Errors
  ERROR: 'error',
} as const;

// ─── File Upload ──────────────────────────────────────────────────────────────
export const FILE_LIMITS = {
  AVATAR_MAX_SIZE: 5 * 1024 * 1024,         // 5 MB
  THUMBNAIL_MAX_SIZE: 10 * 1024 * 1024,     // 10 MB
  VIDEO_MAX_SIZE: 500 * 1024 * 1024,        // 500 MB
  DOCUMENT_MAX_SIZE: 50 * 1024 * 1024,      // 50 MB
  CHAT_FILE_MAX_SIZE: 25 * 1024 * 1024,     // 25 MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/zip', 'application/x-zip-compressed'],
} as const;

// ─── XP Config ────────────────────────────────────────────────────────────────
export const XP_CONFIG = {
  EASY_PROBLEM: 10,
  MEDIUM_PROBLEM: 25,
  HARD_PROBLEM: 50,
  EXPERT_PROBLEM: 100,
  COURSE_COMPLETE: 200,
  LECTURE_COMPLETE: 5,
  STREAK_BONUS: 10,
  FIRST_SUBMISSION: 5,
  POST_CREATED: 2,
  COMMENT_POSTED: 1,
} as const;

// ─── Level Thresholds ─────────────────────────────────────────────────────────
export const LEVEL_THRESHOLDS = [
  { level: 1, minXp: 0, title: 'Beginner' },
  { level: 2, minXp: 100, title: 'Learner' },
  { level: 3, minXp: 300, title: 'Explorer' },
  { level: 4, minXp: 600, title: 'Developer' },
  { level: 5, minXp: 1000, title: 'Coder' },
  { level: 6, minXp: 1500, title: 'Programmer' },
  { level: 7, minXp: 2500, title: 'Engineer' },
  { level: 8, minXp: 4000, title: 'Senior Engineer' },
  { level: 9, minXp: 6000, title: 'Expert' },
  { level: 10, minXp: 10000, title: 'Master' },
] as const;

// ─── Supported Languages ─────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  'javascript',
  'typescript',
  'python',
  'java',
  'c',
  'cpp',
  'go',
  'rust',
  'sql',
  'html',
  'css',
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// ─── App Constants ────────────────────────────────────────────────────────────
export const APP = {
  NAME: 'Coding World',
  API_PREFIX: '/api/v1',
  HEALTH_PATH: '/health',
  DOCS_PATH: '/api/docs',
  MAX_COMMENT_DEPTH: 2,
  DEFAULT_AVATAR: 'https://cdn.codingworld.in/avatars/default.png',
  CERTIFICATE_PREFIX: 'CW',
} as const;
