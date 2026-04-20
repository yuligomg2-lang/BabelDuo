import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import Message, { Room, User } from './src/lib/models';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/babel-duo';
const GUEST_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Cleanup Task: Delete expired guests every hour
setInterval(async () => {
  try {
    const expiryDate = new Date(Date.now() - GUEST_EXPIRY_MS);
    const result = await User.deleteMany({
      isGuest: true,
      createdAt: { $lt: expiryDate }
    });
    if (result.deletedCount > 0) {
      console.log(`Cleanup: Deleted ${result.deletedCount} expired guest users.`);
    }
  } catch (err) {
    console.error('Cleanup Task Error:', err);
  }
}, 60 * 60 * 1000); 

app.use(cors());
app.use(express.json());

// Database connection check middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/health' && mongoose.connection.readyState !== 1) {
    return res.status(503).json({ 
      error: 'Base de datos no disponible', 
      details: 'El servidor no pudo conectarse a MongoDB. Revisa tu configuracion de IP (Whitelist) en MongoDB Atlas.' 
    });
  }
  next();
});

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout faster if IP is not whitelisted
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('CRITICAL: MongoDB connection error. Please ensure your IP is whitelisted (0.0.0.0/0) in MongoDB Atlas.');
    console.error(err);
  });

// API Routes
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'ok', 
    database: dbStatus,
    note: dbStatus === 'disconnected' ? 'Check your MONGODB_URI or IP whitelist in MongoDB Atlas' : undefined
  });
});

app.get('/api/rooms', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    // Check if guest is expired
    const user = await User.findOne({ uid: userId });
    if (user && user.isGuest) {
      const age = Date.now() - new Date(user.createdAt).getTime();
      if (age > GUEST_EXPIRY_MS) {
        await User.deleteOne({ uid: userId });
        return res.status(401).json({ error: 'Sesión de invitado expirada (24h). Por favor, inicia sesión de nuevo.' });
      }
    }

    const rooms = await Room.find({ members: userId }).sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (err: any) {
    console.error('API Error (getRooms):', err.message);
    res.status(500).json({ error: 'Failed to fetch rooms', details: err.message });
  }
});

app.get('/api/rooms/:roomId/messages', async (req, res) => {
  try {
    const messages = await Message.find({ roomId: req.params.roomId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err: any) {
    console.error('API Error (getMessages):', err.message);
    res.status(500).json({ error: 'Failed to fetch messages', details: err.message });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const roomData = { ...req.body };
    if (!roomData.inviteCode) {
      roomData.inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    }
    const room = new Room(roomData);
    await room.save();
    res.json(room);
  } catch (err: any) {
    console.error('API Error (createRoom):', err.message);
    res.status(500).json({ error: 'Failed to create room', details: err.message });
  }
});

app.post('/api/rooms/join', async (req, res) => {
  try {
    const { inviteCode, userId } = req.body;
    if (!inviteCode || !userId) return res.status(400).json({ error: 'Faltan datos' });

    const room = await Room.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!room) return res.status(404).json({ error: 'Sala no encontrada. Revisa el código.' });

    if (!room.members.includes(userId)) {
      room.members.push(userId);
      await room.save();
    }

    res.json(room);
  } catch (err: any) {
    console.error('API Error (joinRoom):', err.message);
    res.status(500).json({ error: 'Error al unirse a la sala', details: err.message });
  }
});

app.delete('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.query; // Poor man's auth for a prototype

    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    if (room.createdBy !== userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this room' });
    }

    await Room.findByIdAndDelete(roomId);
    await Message.deleteMany({ roomId });
    
    res.json({ success: true, message: 'Room and messages deleted' });
  } catch (err: any) {
    console.error('API Error (deleteRoom):', err.message);
    res.status(500).json({ error: 'Failed to delete room', details: err.message });
  }
});

app.post('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Check if we are trying to update an expired guest
    const existingUser = await User.findOne({ uid });
    if (existingUser && existingUser.isGuest) {
      const age = Date.now() - new Date(existingUser.createdAt).getTime();
      if (age > GUEST_EXPIRY_MS) {
        // If expired, we delete it so the upsert creates a fresh one (or we could return 401)
        console.log(`User ${uid} guest expired, deleting before update.`);
        await User.deleteOne({ uid });
      }
    }

    const user = await User.findOneAndUpdate(
      { uid: req.params.uid },
      { $set: req.body },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(user);
  } catch (err: any) {
    console.error('API Error (updateUser):', err.message);
    res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
});

app.post('/api/messages/:messageId/translations', async (req, res) => {
  try {
    const { language, text } = req.body;
    const msg = await Message.findById(req.params.messageId);
    if (!msg) return res.status(404).json({ error: 'Message not found' });

    msg.translations.set(language, text);
    await msg.save();
    
    // Broadcast the update so all clients see the new translation
    io.to(msg.roomId).emit('message-updated', msg);
    
    res.json(msg);
  } catch (err: any) {
    console.error('API Error (saveTranslation):', err.message);
    res.status(500).json({ error: 'Failed to save translation' });
  }
});

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send-message', async (data) => {
    try {
      const { roomId, senderId, senderName, senderLanguage, text, audioData } = data;
      
      if (!roomId) {
        console.error('Socket Error: Received message without roomId', data);
        return;
      }

      const newMessage = new Message({
        roomId,
        senderId,
        senderName,
        senderLanguage,
        text,
        audioData,
        readBy: [senderId],
        translations: new Map()
      });

      await newMessage.save();
      
      // Broadcast to everyone in the room
      io.to(roomId).emit('new-message', newMessage);
    } catch (err) {
      console.error('Socket error:', err);
    }
  });

  socket.on('typing', ({ roomId, userId, userName, isTyping }) => {
    socket.to(roomId).emit('user-typing', { userId, userName, isTyping });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Vite Middleware for Dev
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
