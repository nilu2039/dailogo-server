import "dotenv/config";
import Fastify from "fastify";
import fastifyIO from "fastify-socket.io";
import { Server } from "socket.io";
import { socket } from "./lib/utils/socket";
import { peer } from "./lib/utils/peer";

declare module "fastify" {
  interface FastifyInstance {
    io: Server;
  }
}

const main = async () => {
  const server = Fastify({ logger: process.env.NODE_ENV !== "production" });
  server.log.info(typeof server);
  server.register(fastifyIO, { cors: { origin: "*" } });
  const port = parseInt(process.env.PORT ?? "4000");
  peer();

  server.ready().then(() => {
    socket(server);
  });

  server.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }
  });
};

main();
