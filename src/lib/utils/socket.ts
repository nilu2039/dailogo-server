import { FastifyInstance } from "fastify";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { SOCKET_EVENTS } from "./constans";
import { redis } from "../redis";

const generateUniqueRoomId = () => {
  return uuidv4();
};

async function matchUsers(io: Server, socket: Socket, userId: string) {
  const waitingUsers = await redis.smembers("waitingUsers");
  if (waitingUsers.length === 1 && waitingUsers[0] === userId) return;
  if (waitingUsers.length >= 1) {
    await redis.srem("waitingUsers", userId);
    const randomUser = await redis.spop("waitingUsers");
    if (!randomUser || randomUser === userId) return;
    const roomId = generateUniqueRoomId();
    io.to([userId, randomUser]).emit(SOCKET_EVENTS.MATCH_FOUND, roomId);
  } else {
    socket.emit(SOCKET_EVENTS.MATCH_FOUND, null);
  }
}

export const socket = (server: FastifyInstance) => {
  const io: Server = server.io;
  io.on("connection", (socket: Socket) => {
    server.log.info(`User ${socket.id} connected`);

    socket.on(SOCKET_EVENTS.FIND_MATCH, async () => {
      server.log.info(`User ${socket.id} is looking for a match`);
      const isUserInWaitingList = await redis.sismember(
        "waitingUsers",
        socket.id
      );
      if (isUserInWaitingList) return;
      await redis.sadd("waitingUsers", socket.id);
      await matchUsers(io, socket, socket.id);
    });

    socket.on(
      SOCKET_EVENTS.JOIN_ROOM,
      async (peerId: string, roomId: string) => {
        server.log.info(`User with peerId ${peerId} joined room ${roomId}`);
        if (!roomId || !peerId) return;
        await socket.join(roomId);
        socket.broadcast.to(roomId).emit(SOCKET_EVENTS.USER_CONNECTED, peerId);
      }
    );

    socket.on(
      SOCKET_EVENTS.MESSAGE_SENT,
      (roomId: string, peerId: string, message: string) => {
        socket.join(roomId);
        socket.broadcast
          .to(roomId)
          .emit(SOCKET_EVENTS.MESSAGE_SENT, peerId, message);
      }
    );

    socket.on(SOCKET_EVENTS.NEXT_MATCH, async () => {
      const isUserInWaitingList = await redis.sismember(
        "waitingUsers",
        socket.id
      );
      if (isUserInWaitingList) return;
      await redis.sadd("waitingUsers", socket.id);
      await matchUsers(io, socket, socket.id);
    });

    socket.on(
      SOCKET_EVENTS.USER_LEAVE_ROOM,
      (roomId: string, peerId: string) => {
        socket.join(roomId);
        socket.broadcast
          .to(roomId)
          .emit(SOCKET_EVENTS.USER_LEAVE_ROOM, socket.id, peerId);
      }
    );

    socket.on(
      SOCKET_EVENTS.SYNC_WHITEBOARD,
      ({
        roomId,
        clientId,
        type,
        updates,
      }: {
        roomId: string;
        clientId: string;
        type: string;
        updates: unknown;
      }) => {
        socket.join(roomId);
        socket.broadcast
          .to(roomId)
          .emit(SOCKET_EVENTS.SYNC_WHITEBOARD, { clientId, type, updates });
      }
    );

    socket.on("disconnect", () => {
      redis.srem("waitingUsers", socket.id);
      socket.broadcast.emit(SOCKET_EVENTS.USER_LEAVE_ROOM, socket.id, null);
      server.log.info(`User with socket id ${socket.id} has disconnected`);
    });
  });
};
