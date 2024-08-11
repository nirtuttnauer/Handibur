import express from 'express';
import path from 'path';
import http from 'http';
import { Server as socketIo } from 'socket.io';
import cors from 'cors';

const app = express();
const port = 8080;
const allowedOrigin = 'https://c06c-2a0d-6fc0-747-bc00-e5a8-cebd-53c-b580.ngrok-free.app/io/webrtc';

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

const peers = io.of('/webrtcPeer');

let connectedPeers = new Map();
let offerMap = new Map(); // Map to track users who have received offers

// Function to retry sending data to a user
const retrySendToUser = (targetUserID, event, data, retries = 3, delay = 2000) => {
  if (retries <= 0) {
    console.log(`\x1b[31m[${new Date().toISOString()}] Failed to send ${event} to ${targetUserID} after multiple attempts\x1b[0m`);
    const senderSocket = connectedPeers.get(data.senderID);
    const targetSocket = connectedPeers.get(targetUserID);

    if (senderSocket) {
      console.log(`\x1b[31m[${new Date().toISOString()}] Notifying sender ${data.senderID} to end the call\x1b[0m`);
      senderSocket.emit('endCall', { reason: 'Failed to reach target user' });
    }
    
    if (targetSocket) {
      console.log(`\x1b[31m[${new Date().toISOString()}] Notifying target ${targetUserID} to end the call\x1b[0m`);
      targetSocket.emit('endCall', { reason: 'Failed to establish connection' });
    }

    offerMap.delete(targetUserID); // Clean up the offer map
    return;
  }

  const targetSocket = connectedPeers.get(targetUserID);
  if (targetSocket) {
    console.log(`[${new Date().toISOString()}] Sending ${event} from ${data.senderID} to ${targetUserID}`);
    targetSocket.emit(event, data.payload);
  } else {
    console.log(`[${new Date().toISOString()}] Target user ${targetUserID} is not connected. Retrying in ${delay}ms...`);
    setTimeout(() => {
      retrySendToUser(targetUserID, event, data, retries - 1, delay);
    }, delay);
  }
};

// Handle new peer connections
peers.on('connection', socket => {
  const userID = socket.handshake.query.userID;

  if (!userID || userID === 'undefined') {
    console.error(`\x1b[31m[${new Date().toISOString()}] Connection attempt with undefined userID\x1b[0m`);
    socket.disconnect(true); // Disconnect the socket if no userID is provided
    return;
  }

  console.log(`\x1b[32m[${new Date().toISOString()}] WebRTC Peer connected: ${userID}\x1b[0m`);

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  // Handle peer disconnection
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] WebRTC Peer disconnected: ${userID}`);
    connectedPeers.delete(userID);
    offerMap.delete(userID); // Remove any offers associated with this user when they disconnect
  });

  // Handle offer or answer events
  socket.on('offerOrAnswer', (data) => {
    const targetUserID = data.targetUserID;

    if (!targetUserID) {
      console.warn(`\x1b[31m[${new Date().toISOString()}] No targetUserID provided by ${userID}\x1b[0m`);
      return;
    }

    if (data.payload.type === 'offer') {
      offerMap.set(targetUserID, { sdp: data.payload, senderID: userID }); // Track the offer by targetUserID
      // Set a timeout to delete the offer after 60 seconds if no answer is received
      setTimeout(() => {
        if (offerMap.has(targetUserID)) {
          console.log(`\x1b[31m[${new Date().toISOString()}] Offer timed out for ${targetUserID}. Removing offer.\x1b[0m`);
          offerMap.delete(targetUserID);
          
          const senderSocket = connectedPeers.get(userID);
          if (senderSocket) {
            senderSocket.emit('endCall', { reason: 'Offer timed out' });
          }
        }
      }, 60000);
    } else if (data.payload.type === 'answer') {
      offerMap.delete(targetUserID); // Remove the offer from the target user when an answer is sent
    }

    retrySendToUser(targetUserID, 'offerOrAnswer', { senderID: userID, payload: data.payload });
  });

  // Event to check if the user has any offers
  socket.on('check-offer', () => {
    const offerData = offerMap.get(userID);
    if (offerData) {
      console.log(`\x1b[34m[${new Date().toISOString()}] Sending pending offer to ${userID} from ${offerData.senderID}\x1b[0m`);
      socket.emit('pending-offer', { sdp: offerData.sdp, senderID: offerData.senderID });
    } else {
      console.log(`\x1b[34m[${new Date().toISOString()}] No pending offer for ${userID}\x1b[0m`);
      socket.emit('no-offer');
    }
  });

  // Handle candidate events
  socket.on('candidate', (data) => {
    const targetUserID = data.targetUserID;

    if (!targetUserID) {
      console.warn(`\x1b[31m[${new Date().toISOString()}] No targetUserID provided by ${userID} for candidate\x1b[0m`);
      return;
    }

    retrySendToUser(targetUserID, 'candidate', { senderID: userID, payload: data.payload });
  });
});

// Start the server and log the startup time
server.listen(port, () => {
  console.log(`[${new Date().toISOString()}] Server is running on http://localhost:${port}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`[${new Date().toISOString()}] Shutting down server gracefully...`);
  io.close(() => {
    console.log(`[${new Date().toISOString()}] Socket.IO connections closed`);
    server.close(() => {
      console.log(`[${new Date().toISOString()}] Server closed`);
      process.exit(0);
    });
  });
});