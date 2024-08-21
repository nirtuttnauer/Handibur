import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';

const app = express();
const port = 8080;
const allowedOrigin = 'https://6402-2a0d-6fc2-49a3-2000-c9b9-78cc-590-c617.ngrok-free.app/io/webrtc';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.static(path.join(process.cwd(), 'build')));

app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'build', 'index.html'));
});

const server = http.createServer(app);

const io = new socketIo(server, {
  path: '/io/webrtc',
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

io.on('connection', socket => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const peers = io.of('/webrtcPeer');

let connectedPeers = new Map();

peers.on('connection', socket => {
  const userID = socket.handshake.query.userID;
  console.log('WebRTC Peer connected:', userID);

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  socket.on('disconnect', () => {
    console.log('WebRTC Peer disconnected:', userID);
    connectedPeers.delete(userID);
  });

  socket.on('offerOrAnswer', (data) => {
    for (const [peerID, peerSocket] of connectedPeers.entries()) {
      if (peerID !== userID) {
        console.log(`Forwarding ${data.payload.type} from ${userID} to ${peerID}`);
        peerSocket.emit('offerOrAnswer', data.payload);
      }
    }
  });

  socket.on('candidate', (data) => {
    for (const [peerID, peerSocket] of connectedPeers.entries()) {
      if (peerID !== data.userID) {
        console.log(`Forwarding candidate from ${userID} to ${peerID}`);
        peerSocket.emit('candidate', data.payload);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});