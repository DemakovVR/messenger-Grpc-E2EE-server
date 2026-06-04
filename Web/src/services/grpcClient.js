import * as messagePb from "../proto/message_pb";
import * as grpcWebPb from "../proto/message_grpc_web_pb";

const ConnectRequest = 
  messagePb.ConnectRequest || 
  messagePb.message?.ConnectRequest || 
  (messagePb.default && (messagePb.default.ConnectRequest || messagePb.default.message?.ConnectRequest)) ||
  window.proto?.message?.ConnectRequest;

const MessageServiceClient = 
  grpcWebPb.MessageServiceClient || 
  grpcWebPb.message?.MessageServiceClient || 
  (grpcWebPb.default && (grpcWebPb.default.MessageServiceClient || grpcWebPb.default.message?.MessageServiceClient)) ||
  window.proto?.message?.MessageServiceClient;

export class GrpcClient {
  constructor() {
    this.host = "http://localhost:8081";
    this.client = null;
    this.stream = null;
    this.subscribers = new Map();
    this.connected = false;
    this.userId = null;
    this.token = null;
    this.reconnectTimer = null;
    this.listeners = { connect: [], disconnect: [] };
  }

  connect(userId, token) {
    console.log("GrpcClient.connect()", { userId, token: token ? token.slice(0, 20) + "..." : null });
    if (!userId) {
      console.error("Невозможно подключиться, userId отсутствует");
      return;
    }
    if (this.stream) this.disconnect();
    this.userId = userId;
    this.token = token;
    this.startStream();
  }

  startStream() {
    console.log("🚀 GrpcClient.startStream()");

    if (!ConnectRequest || !MessageServiceClient) {
      console.error("Критическая ошибка: Не удалось обнаружить ConnectRequest или MessageServiceClient в proto-файлах.");
      console.log("Диагностические данные:", { messagePb, grpcWebPb, globalProto: window.proto });
      return;
    }

    const request = new ConnectRequest();
    const metadata = { authorization: `Bearer ${this.token}` };

    try {
      this.client = new MessageServiceClient(this.host, null, null);
      this.stream = this.client.connectMessages(request, metadata);

      this.stream.on("data", (message) => {
        const chatId = message.getChatId();
        console.log(`gRPC Stream: Получено сообщение для чата: ${chatId}`);
        const callback = this.subscribers.get(chatId);
        if (callback) {
          callback({
            id: message.getId(),
            chatId: message.getChatId(),
            senderId: message.getSenderId(),
            encryptedContent: message.getEncryptedContent(),
            isEncrypted: message.getIsEncrypted(),
            sentAt: message.getSentAt(),
            createdAt: message.getCreatedAt(),
          });
        }
      });

      this.stream.on("status", (status) => {
        console.log("gRPC Stream статус:", status.code, status.details);
        if (status.code === 0 && !this.connected) {
          this.connected = true;
          this.emit('connect');
        }
      });

      this.stream.on("error", (err) => {
        console.error("Ошибка gRPC стрима:", err);
        this.handleDisconnect();
      });

      this.stream.on("end", () => {
        console.warn("gRPC Stream закрыт сервером (end)");
        this.handleDisconnect();
      });

      this.connected = true;
      this.emit('connect');

    } catch (error) {
      console.error("Ошибка при инициализации стрима:", error);
    }
  }

  handleDisconnect() {
    this.connected = false;
    this.emit('disconnect');
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (this.userId && this.token) this.startStream();
    }, 3000);
  }

  subscribe(chatId, callback) {
    console.log(`Subscribe для chatId: ${chatId}`);
    this.subscribers.set(chatId, callback);
  }

  unsubscribe(chatId) {
    console.log(`Unsubscribe для chatId: ${chatId}`);
    this.subscribers.delete(chatId);
  }

  disconnect() {
    console.log("Disconnect");
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.stream) { 
      this.stream.cancel();
      this.stream = null; 
    }
    this.connected = false;
    this.userId = null;
    this.token = null;
  }

  isConnected() { return this.connected; }
  on(event, callback) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(callback); }
  off(event, callback) { if (!this.listeners[event]) return; this.listeners[event] = this.listeners[event].filter(cb => cb !== callback); }
  emit(event) { if (this.listeners[event]) this.listeners[event].forEach(cb => cb()); }
}

export const grpcClient = new GrpcClient();