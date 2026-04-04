import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import type { ExecutionStep, ExecutionPlan } from '@ouro/core';

let io: SocketIOServer | null = null;

export function setupWebSocket(httpServer: Server): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws',
  });

  io.on('connection', (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // Client can subscribe to a specific signal's execution
    socket.on('subscribe:signal', (signalId: string) => {
      socket.join(`signal:${signalId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// === Emit events to all clients watching a signal ===

export function emitSignalParsed(signalId: string, intent: any): void {
  io?.to(`signal:${signalId}`).emit('signal:parsed', { signalId, intent });
  io?.emit('signal:parsed', { signalId, intent }); // Also broadcast
}

export function emitExecutionPlanned(signalId: string, plan: any): void {
  io?.to(`signal:${signalId}`).emit('execution:planned', { signalId, plan });
  io?.emit('execution:planned', { signalId, plan });
}

export function emitStepStarted(signalId: string, step: ExecutionStep): void {
  io?.to(`signal:${signalId}`).emit('step:started', { signalId, stepId: step.id, tool: step.tool });
  io?.emit('step:started', { signalId, stepId: step.id, tool: step.tool });
}

export function emitStepCompleted(signalId: string, step: ExecutionStep): void {
  io?.to(`signal:${signalId}`).emit('step:completed', { signalId, stepId: step.id, tool: step.tool, status: step.status });
  io?.emit('step:completed', { signalId, stepId: step.id, tool: step.tool, status: step.status });
}

export function emitStepFailed(signalId: string, step: ExecutionStep, error: string): void {
  io?.to(`signal:${signalId}`).emit('step:failed', { signalId, stepId: step.id, tool: step.tool, error });
  io?.emit('step:failed', { signalId, stepId: step.id, tool: step.tool, error });
}

export function emitExecutionCompleted(signalId: string, plan: ExecutionPlan, artifacts: any[]): void {
  io?.to(`signal:${signalId}`).emit('execution:completed', { signalId, planId: plan.id, status: plan.status, artifacts });
  io?.emit('execution:completed', { signalId, planId: plan.id, status: plan.status, artifacts });
}

export function emitEvolutionOccurred(event: any): void {
  io?.emit('evolution:occurred', event);
}

export function getIO(): SocketIOServer | null { return io; }

export function emitToAll(event: string, data: any): void {
  if (io) io.emit(event, data);
}
