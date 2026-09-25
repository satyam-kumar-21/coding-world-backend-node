import { Server, Socket } from 'socket.io';
import { liveService } from '../../modules/live/live.service';
import { SOCKET_EVENTS } from '../../constants';
import { logger } from '../../config/logger';

export function registerLiveHandlers(io: Server, socket: Socket) {
  const userId = (socket.data as { userId: string }).userId;

  socket.on(SOCKET_EVENTS.LIVE_JOIN, async (data: {
    currentActivity?: string;
    codingLanguage?: string;
    liveNote?: string;
  }) => {
    try {
      await liveService.setLiveStatus(userId, true, data);
      socket.join('live:room');
      io.to('live:room').emit(SOCKET_EVENTS.LIVE_UPDATE, { userId, isLive: true, ...data });
    } catch (err) {
      logger.error({ err, userId }, 'live:join error');
    }
  });

  socket.on(SOCKET_EVENTS.LIVE_LEAVE, async () => {
    try {
      await liveService.setLiveStatus(userId, false);
      socket.leave('live:room');
      io.to('live:room').emit(SOCKET_EVENTS.LIVE_UPDATE, { userId, isLive: false });
    } catch (err) {
      logger.error({ err, userId }, 'live:leave error');
    }
  });
}
