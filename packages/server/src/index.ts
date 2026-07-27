import { createServer } from 'http';
import mongoose from 'mongoose';
import { env, assertProductionSecrets } from './config/env';
import { app } from './app';
import { setupSocket } from './socket';

assertProductionSecrets();

const httpServer = createServer(app);
const io = setupSocket(httpServer);

const start = async () => {
  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('Connected to MongoDB');

    httpServer.listen(env.PORT, () => {
      console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
      console.log(`WebSocket server ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();

export { app, httpServer, io };
