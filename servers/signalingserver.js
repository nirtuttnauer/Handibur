import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://c06c-2a0d-6fc0-747-bc00-e5a8-cebd-53c-b580.ngrok-free.app/io/webrtc';

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level}] ${message}`)
  ),
  transports: [
    new winston.transports.Console()
  ]
});

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
  logger.info(chalk.green(`A user connected: ${socket.id}`));

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`User disconnected: ${socket.id}`));
  });
});

const peers = io.of('/webrtcPeer');

let connectedPeers = new Map();

peers.on('connection', socket => {
  const userID = socket.handshake.query.userID;
  logger.info(chalk.green(`WebRTC Peer connected: ${userID}`));

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`WebRTC Peer disconnected: ${userID}`));
    connectedPeers.delete(userID);
  });

  socket.on('offerOrAnswer', (data) => {
    for (const [peerID, peerSocket] of connectedPeers.entries()) {
      if (peerID !== userID) {
        logger.info(chalk.blue(`Forwarding ${data.payload.type} from ${userID} to ${peerID}`));
        peerSocket.emit('offerOrAnswer', data.payload);
      }
    }
  });

  socket.on('candidate', (data) => {
    for (const [peerID, peerSocket] of connectedPeers.entries()) {
      if (peerID !== data.userID) {
        logger.info(chalk.blue(`Forwarding candidate from ${userID} to ${peerID}`));
        peerSocket.emit('candidate', data.payload);
      }
    }
  });
});

server.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info(chalk.red(`[${new Date().toISOString()}] Shutting down server gracefully...`));
  io.close(() => {
    logger.info(chalk.red(`[${new Date().toISOString()}] Socket.IO connections closed`));
    server.close(() => {
      logger.info(chalk.red(`[${new Date().toISOString()}] Server closed`));
      process.exit(0);
    });
  });
});