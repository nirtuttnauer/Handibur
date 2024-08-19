import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://de4a-2a0d-6fc0-747-bc00-9449-dc3d-88d1-fdd9.ngrok-free.app/io/webrtc';

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
    const payload = data.payload || data; // Support both wrapped and unwrapped data
    if (payload && payload.type && payload.sdp && data.targetUserID) {
      const targetPeer = connectedPeers.get(data.targetUserID);
      if (targetPeer) {
        logger.info(chalk.blue(`Forwarding ${payload.type} from ${userID} to ${data.targetUserID}`));
        targetPeer.emit('offerOrAnswer', payload);
      } else {
        logger.warn(`Target peer ${data.targetUserID} not found for forwarding offer/answer from ${userID}`);
      }
    } else {
      logger.warn(`Received malformed offerOrAnswer data from ${userID}: ${JSON.stringify(data)}`);
    }
  });

  socket.on('candidate', (data) => {
    if (data.candidate && data.targetUserID) {
      const targetPeer = connectedPeers.get(data.targetUserID);
      if (targetPeer) {
        logger.info(chalk.blue(`Forwarding candidate from ${userID} to ${data.targetUserID}`));
        targetPeer.emit('candidate', data);
      } else {
        logger.warn(`Target peer ${data.targetUserID} not found for forwarding candidate from ${userID}`);
      }
    } else {
      logger.warn(`Received malformed candidate data from ${userID}: ${JSON.stringify(data)}`);
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