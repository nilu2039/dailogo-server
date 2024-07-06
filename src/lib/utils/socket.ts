import { FastifyInstance } from "fastify";
import { Server, Socket } from "socket.io";
import { v4 as uuidv4 } from "uuid";
import { SOCKET_EVENTS } from "./constans";
import { redis } from "../redis";

const generateUniqueRoomId = () => {
  return uuidv4();
};

async function matchUsers(io: Server, socket: Socket) {
  const waitingUsers = await redis.smembers("waitingUsers");
  console.log(waitingUsers);
  if (waitingUsers.length >= 2) {
    const [user1, user2] = await redis.spop("waitingUsers", 2);
    console.log("1st-->", user1, user2);
    if (!user1 || !user2 || user1 === user2) return;
    console.log("2nd-->", user1, user2);
    const roomId = generateUniqueRoomId();
    io.to([user1, user2]).emit(SOCKET_EVENTS.MATCH_FOUND, roomId);
  } else {
    console.log("inside else");
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
      console.log("isUserInWaitingList", isUserInWaitingList);
      if (isUserInWaitingList) return;
      redis.sadd("waitingUsers", socket.id);
      await matchUsers(io, socket);
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
      SOCKET_EVENTS.USER_TOGGLE_AUDIO,
      (userId: string, roomId: string) => {
        socket.join(roomId);
        socket.broadcast
          .to(roomId)
          .emit(SOCKET_EVENTS.USER_TOGGLE_AUDIO, userId);
      }
    );

    socket.on(
      SOCKET_EVENTS.USER_LEAVE_ROOM,
      (userId: string, roomId: string) => {
        socket.join(roomId);
        socket.broadcast.to(roomId).emit(SOCKET_EVENTS.USER_LEAVE_ROOM, userId);
      }
    );

    socket.on("disconnect", () => {
      redis.srem("waitingUsers", socket.id);
      server.log.info(`User with socket id ${socket.id} has disconnected`);
    });
  });
};
