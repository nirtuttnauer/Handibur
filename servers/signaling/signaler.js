import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://4f61fabc665a.ngrok.app'; // Replace with your allowed origin

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

const server = http.createServer(app);

const io = new socketIo(server, {
  path: '/io/webrtc',
  cors: {
    origin: allowedOrigin,
    methods: ['GET', 'POST']
  }
});

// Namespace for WebRTC Peers (/webrtcPeer)
const webrtcPeerNamespace = io.of('/webrtcPeer');
let connectedPeers = new Map();

webrtcPeerNamespace.on('connection', socket => {
  const userID = socket.handshake.auth.userID;
  const role = socket.handshake.auth.role;
  if (role === "server") {
    logger.info(chalk.green(`WebRTC Server connected: ${userID}`));

  }
  else{
    logger.info(chalk.green(`WebRTC Peer connected: ${userID}`));
  }

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`WebRTC Peer disconnected: ${userID}`));
    connectedPeers.delete(userID);
  });

  socket.on('offerOrAnswer', (data) => {
    const payload = data.payload || data; 
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
  logger.info(chalk.red(`Shutting down server gracefully...`));
  io.close(() => {
    logger.info(chalk.red(`Socket.IO connections closed`));
    server.close(() => {
      logger.info(chalk.red(`Server closed`));
      process.exit(0);
    });
  });
});