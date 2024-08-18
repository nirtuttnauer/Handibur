import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://276f-109-186-158-191.ngrok-free.app/io/webrtc';

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

const peers = io.of('/agents');

let connectedPeers = new Map();
let serverQueue = [];

// Function to get the next available server from the queue
function getNextAvailableServer() {
  return serverQueue.shift(); // Get the first server in the queue
}

// Function to add a server back to the queue
function addServerToQueue(serverID) {
  serverQueue.push(serverID);
  logger.info(chalk.blue(`Server ${serverID} added back to the queue. Queue length: ${serverQueue.length}`));
}

peers.on('connection', socket => {
  const userID = socket.handshake.query.userID;
  const serverID = socket.handshake.query.serverID;
  logger.info(chalk.green(`WebRTC Peer connected: ${userID} with Server ID: ${serverID}`));

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);
  addServerToQueue(serverID);

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`WebRTC Peer disconnected: ${userID}`));
    connectedPeers.delete(userID);
    serverQueue = serverQueue.filter(id => id !== serverID);
  });

  socket.on('offerOrAnswer', (data) => {
    const targetServer = getNextAvailableServer();
    if (targetServer) {
      logger.info(chalk.blue(`Forwarding ${data.payload.type} from ${userID} to Server ${targetServer}`));
      connectedPeers.get(targetServer)?.emit('offerOrAnswer', data.payload);
      addServerToQueue(targetServer); // Re-add server to the queue after processing the request
    } else {
      logger.warn(chalk.red(`No available servers to handle the call from ${userID}`));
      socket.emit('no-available-servers', { message: 'No servers are currently available to handle your request.' });
    }
  });

  socket.on('candidate', (data) => {
    const targetServer = getNextAvailableServer();
    if (targetServer) {
      logger.info(chalk.blue(`Forwarding candidate from ${userID} to Server ${targetServer}`));
      connectedPeers.get(targetServer)?.emit('candidate', data.payload);
      addServerToQueue(targetServer); // Re-add server to the queue after processing the request
    } else {
      logger.warn(chalk.red(`No available servers to handle the candidate from ${userID}`));
      socket.emit('no-available-servers', { message: 'No servers are currently available to handle your request.' });
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