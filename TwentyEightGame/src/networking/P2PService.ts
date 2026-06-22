import TcpSocket from 'react-native-tcp-socket';
import { NetworkMessage, MessageType } from '../types';

const PORT = 28028;
const DELIMITER = '\n__MSG_END__\n';

type MessageHandler = (message: NetworkMessage) => void;
type ConnectionHandler = (clientId: string) => void;
type DisconnectionHandler = (clientId: string) => void;

interface ClientConnection {
  socket: TcpSocket.Socket;
  id: string;
  buffer: string;
}

export class P2PHost {
  private server: TcpSocket.Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private onMessage: MessageHandler;
  private onConnect: ConnectionHandler;
  private onDisconnect: DisconnectionHandler;
  private hostId: string;

  constructor(
    hostId: string,
    onMessage: MessageHandler,
    onConnect: ConnectionHandler,
    onDisconnect: DisconnectionHandler
  ) {
    this.hostId = hostId;
    this.onMessage = onMessage;
    this.onConnect = onConnect;
    this.onDisconnect = onDisconnect;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = TcpSocket.createServer((socket) => {
          const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
          const client: ClientConnection = { socket, id: clientId, buffer: '' };
          this.clients.set(clientId, client);

          socket.on('data', (data) => {
            client.buffer += data.toString();
            this.processBuffer(client);
          });

          socket.on('close', () => {
            this.clients.delete(clientId);
            this.onDisconnect(clientId);
          });

          socket.on('error', () => {
            this.clients.delete(clientId);
            this.onDisconnect(clientId);
          });
        });

        this.server.listen({ port: PORT, host: '0.0.0.0' }, () => {
          resolve();
        });

        this.server.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private processBuffer(client: ClientConnection) {
    const parts = client.buffer.split(DELIMITER);
    client.buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.trim()) {
        try {
          const message: NetworkMessage = JSON.parse(part);
          // Attach the client socket id for routing
          if (message.type === MessageType.JoinRequest) {
            (message.payload as Record<string, unknown>)._socketId = client.id;
          }
          this.onMessage(message);
        } catch (e) {
          // Invalid JSON, skip
        }
      }
    }
  }

  sendToClient(clientId: string, message: NetworkMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.socket) {
      const data = JSON.stringify(message) + DELIMITER;
      client.socket.write(data);
    }
  }

  broadcast(message: NetworkMessage): void {
    const data = JSON.stringify(message) + DELIMITER;
    for (const client of this.clients.values()) {
      if (client.socket) {
        client.socket.write(data);
      }
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  stop(): void {
    for (const client of this.clients.values()) {
      client.socket.destroy();
    }
    this.clients.clear();
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  getPort(): number {
    return PORT;
  }
}

export class P2PClient {
  private socket: TcpSocket.Socket | null = null;
  private onMessage: MessageHandler;
  private onDisconnect: () => void;
  private buffer: string = '';

  constructor(onMessage: MessageHandler, onDisconnect: () => void) {
    this.onMessage = onMessage;
    this.onDisconnect = onDisconnect;
  }

  connect(host: string, port: number = PORT): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = TcpSocket.createConnection(
          { host, port },
          () => {
            resolve();
          }
        );

        this.socket.on('data', (data) => {
          this.buffer += data.toString();
          this.processBuffer();
        });

        this.socket.on('close', () => {
          this.onDisconnect();
        });

        this.socket.on('error', (error) => {
          reject(error);
        });

        // Set a manual connection timeout
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout'));
          this.socket?.destroy();
        }, 5000);

        this.socket.on('connect', () => {
          clearTimeout(timeoutId);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private processBuffer() {
    const parts = this.buffer.split(DELIMITER);
    this.buffer = parts.pop() || '';

    for (const part of parts) {
      if (part.trim()) {
        try {
          const message: NetworkMessage = JSON.parse(part);
          this.onMessage(message);
        } catch (e) {
          // Invalid JSON, skip
        }
      }
    }
  }

  send(message: NetworkMessage): void {
    if (this.socket) {
      const data = JSON.stringify(message) + DELIMITER;
      this.socket.write(data);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket !== null;
  }
}
