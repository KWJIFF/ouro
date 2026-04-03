import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';

let io: SocketIOServer;

export function setupWebSocket(httpServer: Server): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('signal:submit', (data) => {
      // Real-time signal submission via WebSocket
      socket.emit('signal:received', { status: 'processing' });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function emitToAll(event: string, data: any): void {
  if (io) io.emit(event, data);
}

export function getIO(): SocketIOServer | undefined {
  return io;
}
