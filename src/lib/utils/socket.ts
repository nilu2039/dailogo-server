import { FastifyInstance } from "fastify";

export const socket = (server: FastifyInstance) => {
  const io = server.io;
  io.on("connection", (socket) => {
    server.log.info(`User ${socket.id} connected`);
    socket.on("join-room", (roomId: string, userId: string) => {
      server.log.info(`User ${userId} joined room ${roomId}`);
      socket.join(roomId);
      socket.broadcast.to(roomId).emit("user-connected", userId);
    });

    // socket.on("user-toggle-audio", (userId: string, roomId: string) => {
    //   socket.join(roomId);
    //   socket.broadcast.to(roomId).emit("user-toggle-audio", userId);
    // });

    socket.on("user-leave-room", (userId: string, roomId: string) => {
      socket.join(roomId);
      socket.broadcast.to(roomId).emit("user-leave-room", userId);
    });
  });
};
