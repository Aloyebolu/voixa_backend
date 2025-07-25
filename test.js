import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import express from 'express';

// Authentication token (consider loading from environment variable for better security)
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMDAwMDAxMiIsImVtYWlsIjoia2l0dHlAZ21haWwuY29tIiwicm9sZSI6InVzZXIiLCJpYXQiOjE3NTE2NDgyNjIsImV4cCI6MTA5NzI3MjU0NjYyfQ.WNnNMZdp0KDv-3CVntpH9IlSvLVkjNVuM62septxglY';

// Load data from file
const dataPath = path.resolve('./', 'data.json');
const jsonData = fs.readFileSync(dataPath, 'utf8');
const data = JSON.parse(jsonData);

// Create Express server
const app = express()
app.listen(4002, () => {
  console.log('Server 1 listening on port 4000');
});

// Initialize Socket.IO client
const socket = io('http://localhost:4000', {
  auth: {
    token: `Bearer ${token}`
  },
  transports: ['websocket']
});

// Handle connection event
socket.on('connect', () => {
  console.log('[INFO] Connected to the server.');
  console.log(data)
});

// Handle disconnection
socket.on('disconnect', () => {
  console.log('[INFO] Disconnected from the server.');
});

// Listen for room events
socket.on('room_event', (incomingData) => {
  console.log('[EVENT] Room event received:', incomingData);
});

import readline from 'readline';

if (!process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.on('line', (input) => {
    if (input.trim() === 'e') {
      console.log("Emitting 'room_event'...");
      socket.emit('room_event', data);
    }else{
      console.log('J9')
    }
  });

  rl.on('SIGINT', () => {
    console.log('[EXIT] Process terminated by user.');
    process.exit();
  });
} else {
  console.warn('[WARN] process.stdin is not a TTY. Keyboard input disabled.');
}



// Handle connection errors
socket.on('connect_error', (err) => {
  console.error('[ERROR] Connection failed:', err.message);
  if (err.data) {
    console.error('[ERROR DATA]', err.data);
  }
});
 