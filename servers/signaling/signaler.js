import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';
import winston from 'winston';
import chalk from 'chalk';

const app = express();
const port = 8080;
const allowedOrigin = 'https://4761db7d6332.ngrok.app'; // Replace with your allowed origin

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
  origin: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

const server = http.createServer(app);

const io = new socketIo(server, {
  path: '/io/webrtc',
  cors: {
    origin: true,
    methods: ['GET', 'POST']
  }
});

// Namespace for WebRTC Peers (/webrtcPeer)
const webrtcPeerNamespace = io.of('/webrtcPeer');
let connectedPeers = new Map();
let callMap = new Map(); // Map to track who called who
let callQueue = new Map(); // Map to queue calls for each user
let serverQueue = []; // Queue to hold server IDs
let userToServerMap = new Map(); // Map to hold user-to-server assignments

webrtcPeerNamespace.on('connection', socket => {
  const userID = socket.handshake.auth.userID;
  const role = socket.handshake.auth.role;

  if (role === "server") {
    logger.info(chalk.green(`WebRTC Server connected: ${userID}`));
    serverQueue.push(userID); // Add server to the queue
  } else {
    logger.info(chalk.green(`WebRTC Peer connected: ${userID}`));
  }

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  socket.on('disconnect', () => {
    logger.info(chalk.yellow(`WebRTC Peer disconnected: ${userID}`));
    connectedPeers.delete(userID);
    callMap.delete(userID); // Remove user from callMap on disconnect
    callQueue.delete(userID); // Clear any calls queued for the user
    userToServerMap.delete(userID); // Remove the user-to-server mapping

    if (role === "server") {
      // Remove server from the queue
      serverQueue = serverQueue.filter(serverId => serverId !== userID);
    }
  });

  socket.on('offerOrAnswer', (data) => {
    const payload = data.payload || data; 
    let targetUserID = data.targetUserID;

    // Check if the targetUserID is "123" and replace it with the correct server ID
    if (targetUserID === '123') {
      targetUserID = userToServerMap.get(userID);
      if (!targetUserID) {
        logger.warn(`Assigned server ID not found for user ${userID}.`);
        return;
      }
      data.targetUserID = targetUserID;
      logger.info(chalk.blue(`Replaced target ID "123" with assigned server ID: ${targetUserID}`));
    }

    const targetPeer = connectedPeers.get(targetUserID);
    if (targetPeer) {
      logger.info(chalk.blue(`Forwarding ${payload.type} from ${userID} to ${targetUserID}`));
      targetPeer.emit('offerOrAnswer', payload);
      callMap.set(userID, targetUserID); // Track the call relationship

      // Queue the call for the target user
      if (payload.type === 'offer') {
        callQueue.set(targetUserID, { caller: userID });
      }
    } else {
      logger.warn(`Target peer ${targetUserID} not found for forwarding offer/answer from ${userID}`);
    }
  });

  socket.on('candidate', (data) => {
    let targetUserID = data.targetUserID;

    // Check if the targetUserID is "123" and replace it with the correct server ID
    if (targetUserID === '123') {
      targetUserID = userToServerMap.get(userID);
      if (!targetUserID) {
        logger.warn(`Assigned server ID not found for user ${userID}.`);
        return;
      }
      data.targetUserID = targetUserID;
      logger.info(chalk.blue(`Replaced target ID "123" with assigned server ID: ${targetUserID}`));
    }

    const targetPeer = connectedPeers.get(targetUserID);
    if (targetPeer) {
      logger.info(chalk.blue(`Forwarding candidate from ${userID} to ${targetUserID}`));
      targetPeer.emit('candidate', data);
    } else {
      logger.warn(`Target peer ${targetUserID} not found for forwarding candidate from ${userID}`);
    }
  });

// Handle endCall signal
socket.on('endCall', (data) => {
  if (data.targetUserIDs && Array.isArray(data.targetUserIDs)) {
    data.targetUserIDs.forEach((targetUserID) => {
      // Check if the targetUserID is "123" and replace it with the correct server ID
      if (targetUserID === '123') {
        targetUserID = userToServerMap.get(userID);
        if (!targetUserID) {
          logger.warn(`Assigned server ID not found for user ${userID}.`);
          return;
        }
        logger.info(chalk.blue(`Replaced target ID "123" with assigned server ID: ${targetUserID}`));
      }

      const targetPeer = connectedPeers.get(targetUserID);
      if (targetPeer) {
        logger.info(chalk.blue(`Sending endCall from ${userID} to ${targetUserID}`));
        targetPeer.emit('endCall');
        callMap.delete(userID); // Remove the call relationship when the call ends
        callMap.delete(targetUserID); // Ensure both sides are cleared
      } else {
        logger.warn(`Target peer ${targetUserID} not found for sending endCall from ${userID}`);
      }
    });
  } else {
    logger.warn(`Received malformed endCall data from ${userID}: ${JSON.stringify(data)}`);
  }
});

  // Handle calling signal
  socket.on('calling', (data) => {
    if (data.targetUserID) {
      const targetPeer = connectedPeers.get(data.targetUserID);
      if (targetPeer) {
        logger.info(chalk.blue(`User ${userID} is calling ${data.targetUserID}`));
        targetPeer.emit('incomingCall', { caller: userID });
        callQueue.set(data.targetUserID, { caller: userID });
      } else {
        logger.warn(`Target peer ${data.targetUserID} not found for calling from ${userID}`);
      }
    } else {
      logger.warn(`Received malformed calling data from ${userID}: ${JSON.stringify(data)}`);
    }
  });

  // Handle checkCalling signal
  socket.on('checkCalling', () => {
    if (callQueue.has(userID)) {
      const { caller } = callQueue.get(userID);
      socket.emit('callingStatus', { isBeingCalled: true, from: caller });
      logger.info(chalk.blue(`User ${userID} is being called by ${caller}`));
    } else {
      socket.emit('callingStatus', { isBeingCalled: false });
    }
  });

  // Handle answer to call signal
  socket.on('answerToCall', (data) => {
    const { targetUserID, decision } = data;
    const targetPeer = connectedPeers.get(targetUserID);
    if (targetPeer) {
      logger.info(chalk.blue(`User ${userID} responded with ${decision} to ${targetUserID}`));
      targetPeer.emit('callResponse', { decision, from: userID });
      callQueue.delete(targetUserID);
      callMap.delete(userID);
      callMap.delete(targetUserID);

      if (decision === 'reject') {
        callQueue.delete(targetUserID);
        callMap.delete(userID);
        callMap.delete(targetUserID);
      }
    } else {
      logger.warn(`Target peer ${targetUserID} not found for responding to call from ${userID}`);
    }
  });

  // Function to request a server
  socket.on('requestServer', () => {
    if (serverQueue.length > 0) {
      const serverID = serverQueue.shift(); // Dequeue the first server
      socket.emit('serverAssigned', { serverID: serverID });
      logger.info(chalk.blue(`Assigned server ${serverID} to user ${userID}`));
      userToServerMap.set(userID, serverID); // Store the mapping
    } else {
      socket.emit('noServerAvailable');
      logger.warn(`No servers available to assign to user ${userID}`);
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