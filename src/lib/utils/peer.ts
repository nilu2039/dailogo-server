import { PeerServer } from "peer";

export const peer = () => {
  const PEER_PORT = parseInt(process.env.PEER_PORT ?? "") || 9000;
  PeerServer({ port: PEER_PORT, path: "/peer" });
};
