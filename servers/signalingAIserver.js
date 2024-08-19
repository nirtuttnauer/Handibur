import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://f7d0-109-186-158-191.ngrok-free.app/io/webrtc';

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

  const userID = socket.handshake.auth?.userID;
  const role = socket.handshake.auth?.role || 'user';
  const serverID = socket.handshake.auth?.serverID;

  if (role === 'server') {
    logger.info(chalk.blue(`Server connected with ID: ${serverID}`));
    addServerToQueue(serverID);
  } else {
    logger.info(chalk.blue(`User connected with ID: ${userID}`));
  }

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`User disconnected: ${socket.id}`));
    if (role === 'server') {
      removeServerFromQueue(serverID);
    }
  });
});

const peers = io.of('/agents');

let connectedPeers = new Map();
let serverQueue = [];

// Function to get the next available server from the queue
function getNextAvailableServer() {
  return serverQueue.shift();
}

// Function to add a server to the queue
function addServerToQueue(serverID) {
  if (serverID && !serverQueue.includes(serverID)) {
    serverQueue.push(serverID);

    logger.info(chalk.blue(`Server ${serverID} added to the queue. Queue length: ${serverQueue.length}`));
  }
}

// Function to remove a server from the queue
function removeServerFromQueue(serverID) {
  serverQueue = serverQueue.filter(id => id !== serverID);
  logger.info(chalk.blue(`Server ${serverID} removed from the queue. Queue length: ${serverQueue.length}`));
}

peers.on('connection', socket => {
  const userID = socket.handshake.query.userID || socket.handshake.auth?.userID;
  const { role, serverID } = socket.handshake.auth || {};

  if (!userID || !role) {
    logger.warn(chalk.red(`Connection failed: Missing userID or role.`));
    socket.disconnect();
    return;
  }

  logger.info(chalk.green(`WebRTC Peer connected: userID=${userID}, role=${role}, serverID=${serverID || 'N/A'}`));

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  if (role === 'server' && serverID) {
    addServerToQueue(serverID);
  }

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`WebRTC Peer disconnected: userID=${userID}`));
    connectedPeers.delete(userID);

    if (role === 'server' && serverID) {
      removeServerFromQueue(serverID);
    }
  });

  socket.on('offerOrAnswer', (data) => {
    if (data.type === 'offer') {
      const targetServer = getNextAvailableServer();
      if (targetServer) {
        logger.info(chalk.blue(`Forwarding offer from ${userID} to Server ${targetServer}`));
        connectedPeers.get(targetServer)?.emit('offerOrAnswer', { ...data, from: userID });
        // Server will respond with an answer, and we'll forward it back to the client
      } else {
        logger.warn(chalk.red(`No available servers to handle the call from ${userID}`));
        socket.emit('no-available-servers', { message: 'No servers are currently available to handle your request.' });
      }
    } else if (data.type === 'answer') {
      const clientSocket = connectedPeers.get(data.to);
      if (clientSocket) {
        logger.info(chalk.blue(`Forwarding answer from Server ${userID} to Client ${data.to}`));
        clientSocket.emit('offerOrAnswer', data);
      }
    }
  });

  socket.on('candidate', (data) => {
    const targetPeer = connectedPeers.get(data.to);
    if (targetPeer) {
      logger.info(chalk.blue(`Forwarding candidate from ${userID} to ${data.to}`));
      targetPeer.emit('candidate', data);
    }
  });

  socket.on('endCall', () => {
    logger.info(chalk.green(`Call ended by userID=${userID}`));
    const targetServer = getNextAvailableServer();
    if (targetServer) {
      logger.info(chalk.blue(`Notifying server ${targetServer} of call end.`));
      connectedPeers.get(targetServer)?.emit('endCall');
      addServerToQueue(targetServer); // Only re-add server after full session is done
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