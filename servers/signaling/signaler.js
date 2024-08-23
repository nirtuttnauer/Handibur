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

// Namespace for WebRTC Peers (/webrtcPeer)
const webrtcPeerNamespace = io.of('/webrtcPeer');
let connectedPeers = new Map();

webrtcPeerNamespace.on('connection', socket => {
  const userID = socket.handshake.query.userID;
  logger.info(chalk.green(`WebRTC Peer connected: ${userID}`));

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

// Namespace for AI Servers (/agents)
const agentsNamespace = io.of('/agents');
let serverQueue = [];

function getNextAvailableServer() {
  return serverQueue.shift();
}

function addServerToQueue(serverID, socket) {
  if (serverID && !serverQueue.includes(serverID)) {
    serverQueue.push(serverID);
    connectedPeers.set(serverID, socket);
    logger.info(chalk.blue(`Server ${serverID} added to the queue. Queue length: ${serverQueue.length}`));
  }
}

function removeServerFromQueue(serverID) {
  serverQueue = serverQueue.filter(id => id !== serverID);
  connectedPeers.delete(serverID);
  logger.info(chalk.blue(`Server ${serverID} removed from the queue and connectedPeers. Queue length: ${serverQueue.length}`));
}

agentsNamespace.on('connection', socket => {
  console.log("New connection attempt to /agents namespace: socket ID", socket.id);
  logger.info(chalk.green(`New connection attempt to /agents namespace: socket ID ${socket.id}`));
  const userID = socket.handshake.query.userID || socket.handshake.auth?.userID;
  const { role, serverID } = socket.handshake.auth || {};


  logger.info(chalk.green(`WebRTC Peer connected: userID=${userID || null}, role=${role}, serverID=${serverID || null}`));

  socket.emit('connection-success', { success: userID ?? serverID });

  if (role === 'user' && userID) {
    connectedPeers.set(userID, socket);
  }

  else if (role === 'server' && serverID) {
    addServerToQueue(serverID, socket);
  }

  else {
    logger.warn(chalk.red(`Connection failed: Missing userID or role.`));
    socket.disconnect();
    return;
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
        connectedPeers.get(targetServer)?.emit('offerOrAnswer', { ...data, from: data?.from });
        logger.info(chalk.green(`Offer forwarded from ${userID} to Server ${targetServer}`));
      } else {
        logger.warn(chalk.red(`No available servers to handle the call from ${userID}`));
        socket.emit('no-available-servers', { message: 'No servers are currently available to handle your request.' });
      }
    } else if (data.type === 'answer') {
      const clientSocket = connectedPeers.get(data.to);
      if (clientSocket) {
        logger.info(chalk.blue(`Forwarding answer from Server ${targetServer} to Client ${data.to}`));
        clientSocket.emit('offerOrAnswer', data);
        logger.info(chalk.green(`Answer forwarded from Server ${targetServer} to Client ${data.to}`));
      }
    }
  });

  socket.on('candidate', (data) => {
    const targetPeer = connectedPeers.get(data.to);
    if (targetPeer) {
      logger.info(chalk.blue(`Forwarding candidate from ${userID} to ${data.to}`));
      targetPeer.emit('candidate', data);
      logger.info(chalk.green(`Candidate forwarded from ${userID} to ${data.to}`));
    }
  });

  socket.on('endCall', () => {
    logger.info(chalk.green(`Call ended by userID=${userID}`));
    const targetServer = getNextAvailableServer();
    if (targetServer) {
      logger.info(chalk.blue(`Notifying server ${targetServer} of call end.`));
      connectedPeers.get(targetServer)?.emit('endCall');
      addServerToQueue(targetServer);
      logger.info(chalk.green(`Server ${targetServer} re-added to queue.`));
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