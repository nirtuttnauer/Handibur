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

const peers = io.of('/webrtcPeer');

let connectedPeers = new Map();
let offerMap = new Map(); // Map to track users with offers

// Function to retry sending data to a user
const retrySendToUser = (targetUserID, event, data, retries = 3, delay = 2000) => {
  if (retries <= 0) {
    console.log(`[${new Date().toISOString()}] Failed to send ${event} to ${targetUserID} after multiple attempts`);
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
    console.error(`[${new Date().toISOString()}] Connection attempt with undefined userID`);
    socket.disconnect(true); // Disconnect the socket if no userID is provided
    return;
  }

  console.log(`[${new Date().toISOString()}] WebRTC Peer connected: ${userID}`);

  socket.emit('connection-success', { success: userID });

  connectedPeers.set(userID, socket);

  // Handle peer disconnection
  socket.on('disconnect', () => {
    console.log(`[${new Date().toISOString()}] WebRTC Peer disconnected: ${userID}`);
    connectedPeers.delete(userID);
    offerMap.delete(userID); // Remove offer when user disconnects
  });

  // Handle offer or answer events
  socket.on('offerOrAnswer', (data) => {
    const targetUserID = data.targetUserID;

    if (!targetUserID) {
      console.warn(`[${new Date().toISOString()}] No targetUserID provided by ${userID}`);
      return;
    }

    if (data.payload.type === 'offer') {
      offerMap.set(userID, data.payload); // Store the offer in the map
    } else if (data.payload.type === 'answer') {
      offerMap.delete(userID); // Remove the offer from the map when an answer is sent
    }

    retrySendToUser(targetUserID, 'offerOrAnswer', { senderID: userID, payload: data.payload });
  });

  // Event to check if the user has any offers
  socket.on('check-offer', () => {
    const offer = offerMap.get(userID);
    if (offer) {
      console.log(`[${new Date().toISOString()}] Sending pending offer to ${userID}`);
      socket.emit('pending-offer', offer);
    } else {
      console.log(`[${new Date().toISOString()}] No pending offer for ${userID}`);
      socket.emit('no-offer');
    }
  });

  // Handle candidate events
  socket.on('candidate', (data) => {
    const targetUserID = data.targetUserID;

    if (!targetUserID) {
      console.warn(`[${new Date().toISOString()}] No targetUserID provided by ${userID} for candidate`);
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