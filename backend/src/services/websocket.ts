import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';
import jwt from 'jsonwebtoken';

// WebSocket event types
export type WSEventType =
  | 'notification'
  | 'bed-update'
  | 'queue-update'
  | 'vitals-alert'
  | 'critical-value'
  | 'admission-update'
  | 'discharge-update'
  | 'ot-status'
  | 'emergency-alert'
  | 'lab-result'
  | 'appointment-update'
  | 'message'
  | 'ping'
  | 'pong';

// WebSocket message structure
export interface WSMessage {
  type: WSEventType;
  payload: any;
  timestamp: string;
  targetUserId?: string; // For user-specific messages
  targetRole?: string; // For role-specific messages (e.g., 'DOCTOR', 'NURSE')
  targetDepartment?: string; // For department-specific messages
  broadcast?: boolean; // Send to all connected clients
}

// Connected client info
interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  username: string;
  roles: string[];
  departments: string[];
  tenantId: string;
  branchId?: string;
  connectedAt: Date;
  lastPing: Date;
}

// JWT Payload interface
interface JWTPayload {
  userId: string;
  username: string;
  roleIds?: string[];
  departmentIds?: string[];
  tenantId: string;
  branchId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, ConnectedClient> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: (info, callback) => {
        // Allow connection, authentication happens after connection
        callback(true);
      },
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      this.handleConnection(ws, request);
    });

    // Start ping interval to keep connections alive
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // Ping every 30 seconds

    logger.info('WebSocket server initialized', { path: '/ws' });
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const clientId = this.generateClientId();

    // Extract token from query string or headers
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    const token = url.searchParams.get('token') || this.extractTokenFromHeaders(request.headers);

    if (!token) {
      logger.warn('WebSocket connection rejected - no token', { clientId });
      ws.close(4001, 'Authentication required');
      return;
    }

    // Verify token
    try {
      const jwtSecret = process.env.JWT_SECRET || 'hospital-erp-secret-key';
      const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

      const client: ConnectedClient = {
        ws,
        userId: decoded.userId,
        username: decoded.username,
        roles: decoded.roleIds || [],
        departments: decoded.departmentIds || [],
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        connectedAt: new Date(),
        lastPing: new Date(),
      };

      this.clients.set(clientId, client);

      logger.info('WebSocket client connected', {
        clientId,
        userId: decoded.userId,
        username: decoded.username,
        totalClients: this.clients.size,
      });

      // Send connection confirmation
      this.sendToClient(clientId, {
        type: 'message',
        payload: { status: 'connected', clientId },
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages
      ws.on('message', (data) => {
        this.handleMessage(clientId, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket client error', { clientId, error: error.message });
        this.handleDisconnect(clientId);
      });

    } catch (error) {
      logger.warn('WebSocket connection rejected - invalid token', { clientId, error });
      ws.close(4002, 'Invalid token');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(clientId: string, data: any): void {
    try {
      const message = JSON.parse(data.toString());
      const client = this.clients.get(clientId);

      if (!client) {
        return;
      }

      // Handle ping/pong for keep-alive
      if (message.type === 'ping') {
        client.lastPing = new Date();
        this.sendToClient(clientId, {
          type: 'pong',
          payload: { timestamp: Date.now() },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Log other messages
      logger.debug('WebSocket message received', {
        clientId,
        userId: client.userId,
        type: message.type,
      });

    } catch (error) {
      logger.error('Failed to parse WebSocket message', { clientId, error });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      logger.info('WebSocket client disconnected', {
        clientId,
        userId: client.userId,
        username: client.username,
        totalClients: this.clients.size - 1,
      });
      this.clients.delete(clientId);
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: WSMessage): boolean {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  /**
   * Send message to specific user (all their connections)
   */
  sendToUser(userId: string, message: WSMessage): number {
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sent++;
      }
    }
    return sent;
  }

  /**
   * Send message to users with specific role
   */
  sendToRole(role: string, message: WSMessage): number {
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.roles.includes(role) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sent++;
      }
    }
    return sent;
  }

  /**
   * Send message to users in specific department
   */
  sendToDepartment(departmentId: string, message: WSMessage): number {
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.departments.includes(departmentId) && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sent++;
      }
    }
    return sent;
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage): number {
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sent++;
      }
    }
    return sent;
  }

  /**
   * Broadcast message to specific tenant
   */
  broadcastToTenant(tenantId: string, message: WSMessage): number {
    let sent = 0;
    for (const [clientId, client] of this.clients) {
      if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify(message));
        sent++;
      }
    }
    return sent;
  }

  // ============================================================
  // Convenience methods for common hospital events
  // ============================================================

  /**
   * Send notification to user
   */
  notifyUser(userId: string, notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    link?: string;
  }): void {
    this.sendToUser(userId, {
      type: 'notification',
      payload: notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send bed update to relevant staff
   */
  sendBedUpdate(update: {
    bedId: string;
    wardId: string;
    status: 'available' | 'occupied' | 'reserved' | 'maintenance';
    patientId?: string;
  }): void {
    this.broadcast({
      type: 'bed-update',
      payload: update,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send queue update (for OPD, pharmacy, lab)
   */
  sendQueueUpdate(update: {
    queueType: 'opd' | 'pharmacy' | 'lab' | 'radiology';
    departmentId?: string;
    currentToken: number;
    waitingCount: number;
    averageWaitTime?: number;
  }): void {
    this.broadcast({
      type: 'queue-update',
      payload: update,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send critical vital alert to nursing staff and doctors
   */
  sendVitalsAlert(alert: {
    patientId: string;
    patientName: string;
    mrn: string;
    bedNumber: string;
    wardId: string;
    vitalType: string;
    value: number;
    unit: string;
    severity: 'warning' | 'critical';
    message: string;
  }): void {
    // Send to nurses and doctors
    this.sendToRole('NURSE', {
      type: 'vitals-alert',
      payload: alert,
      timestamp: new Date().toISOString(),
    });
    this.sendToRole('DOCTOR', {
      type: 'vitals-alert',
      payload: alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send critical lab value alert
   */
  sendCriticalValueAlert(alert: {
    patientId: string;
    patientName: string;
    mrn: string;
    testName: string;
    value: string;
    unit: string;
    normalRange: string;
    orderingDoctorId: string;
  }): void {
    // Send to ordering doctor
    this.sendToUser(alert.orderingDoctorId, {
      type: 'critical-value',
      payload: alert,
      timestamp: new Date().toISOString(),
    });

    // Also notify lab techs
    this.sendToRole('LAB_TECH', {
      type: 'critical-value',
      payload: alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send emergency alert to relevant staff
   */
  sendEmergencyAlert(alert: {
    caseId: string;
    patientName: string;
    triageLevel: 'RED' | 'YELLOW' | 'GREEN';
    chiefComplaint: string;
    location: string;
    message: string;
  }): void {
    // Send to emergency department and doctors
    this.sendToRole('EMERGENCY', {
      type: 'emergency-alert',
      payload: alert,
      timestamp: new Date().toISOString(),
    });
    this.sendToRole('DOCTOR', {
      type: 'emergency-alert',
      payload: alert,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send OT status update
   */
  sendOTStatusUpdate(update: {
    otId: string;
    surgeryId: string;
    status: 'preparing' | 'in-progress' | 'closing' | 'completed' | 'cleaning';
    surgeonId?: string;
    patientName?: string;
    estimatedEndTime?: string;
  }): void {
    this.broadcast({
      type: 'ot-status',
      payload: update,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send lab result notification
   */
  sendLabResultReady(result: {
    orderId: string;
    patientId: string;
    patientName: string;
    testNames: string[];
    orderingDoctorId: string;
  }): void {
    // Notify the ordering doctor
    this.sendToUser(result.orderingDoctorId, {
      type: 'lab-result',
      payload: result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send appointment update
   */
  sendAppointmentUpdate(update: {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    status: 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled';
    type: 'new' | 'update' | 'reminder';
  }): void {
    // Notify the doctor
    this.sendToUser(update.doctorId, {
      type: 'appointment-update',
      payload: update,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================
  // Utility methods
  // ============================================================

  /**
   * Ping all clients to check connection
   */
  private pingClients(): void {
    const now = new Date();
    const timeout = 60000; // 60 seconds timeout

    for (const [clientId, client] of this.clients) {
      if (now.getTime() - client.lastPing.getTime() > timeout) {
        logger.info('Closing inactive WebSocket connection', {
          clientId,
          userId: client.userId,
          lastPing: client.lastPing,
        });
        client.ws.close(4003, 'Connection timeout');
        this.clients.delete(clientId);
      } else if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.ping();
      }
    }
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract token from request headers
   */
  private extractTokenFromHeaders(headers: any): string | null {
    const authHeader = headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount(): number {
    return this.clients.size;
  }

  /**
   * Get connected clients info (for admin dashboard)
   */
  getConnectedClients(): Array<{
    userId: string;
    username: string;
    roles: string[];
    connectedAt: Date;
  }> {
    return Array.from(this.clients.values()).map(client => ({
      userId: client.userId,
      username: client.username,
      roles: client.roles,
      connectedAt: client.connectedAt,
    }));
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    if (this.wss) {
      // Close all client connections
      for (const [clientId, client] of this.clients) {
        client.ws.close(1000, 'Server shutting down');
      }
      this.clients.clear();

      this.wss.close();
      logger.info('WebSocket server shut down');
    }
  }
}

// Export singleton instance
export const wsService = new WebSocketService();

// Export for testing
export { WebSocketService };
