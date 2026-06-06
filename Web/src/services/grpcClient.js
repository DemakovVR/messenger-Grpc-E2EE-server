import * as messagePb from "../proto/message_pb";
import * as grpcWebPb from "../proto/message_grpc_web_pb";
import * as filePb from "../proto/file_pb";
import * as fileGrpcWebPb from "../proto/file_grpc_web_pb";

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

const DownloadFileRequest = 
  filePb.DownloadFileRequest || 
  filePb.file?.DownloadFileRequest || 
  (filePb.default && (filePb.default.DownloadFileRequest || filePb.default.file?.DownloadFileRequest)) ||
  window.proto?.file?.DownloadFileRequest;

const FileServiceClient = 
  fileGrpcWebPb.FileServiceClient || 
  fileGrpcWebPb.file?.FileServiceClient || 
  (fileGrpcWebPb.default && (fileGrpcWebPb.default.FileServiceClient || fileGrpcWebPb.default.file?.FileServiceClient)) ||
  window.proto?.file?.FileServiceClient;

class GrpcClientService {
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
    if (!userId) return;
    if (this.stream) this.disconnect();
    this.userId = userId;
    this.token = token;
    this.startStream();
  }

  startStream() {
    if (!ConnectRequest || !MessageServiceClient) return;

    const request = new ConnectRequest();
    const metadata = { authorization: `Bearer ${this.token}` };

    try {
      this.client = new MessageServiceClient(this.host, null, null);
      this.stream = this.client.connectMessages(request, metadata);

      this.stream.on("data", (message) => {
        const chatId = message.getChatId();
        const callback = this.subscribers.get(chatId);
        if (callback) {
          const replyToMessage = message.getReplyTo();
          let replyTo = null;
          if (replyToMessage) {
            replyTo = {
              id: replyToMessage.getId(),
              chatId: replyToMessage.getChatId(),
              senderId: replyToMessage.getSenderId(),
              encryptedContent: replyToMessage.getEncryptedContent(),
              isEncrypted: replyToMessage.getIsEncrypted(),
              sentAt: replyToMessage.getSentAt(),
              createdAt: replyToMessage.getCreatedAt(),
              isEdited: replyToMessage.getIsEdited(),
              isDeleted: replyToMessage.getIsDeleted(),
            };
          }

          callback({
            id: message.getId(),
            chatId: message.getChatId(),
            senderId: message.getSenderId(),
            encryptedContent: message.getEncryptedContent(),
            isEncrypted: message.getIsEncrypted(),
            sentAt: message.getSentAt(),
            createdAt: message.getCreatedAt(),
            replyTo: replyTo,
          });
        }
      });

      this.stream.on("status", (status) => {
        if (status.code === 0 && !this.connected) {
          this.connected = true;
          this.emit('connect');
        }
      });

      this.stream.on("error", () => {
        this.handleDisconnect();
      });

      this.stream.on("end", () => {
        this.handleDisconnect();
      });

      this.connected = true;
      this.emit('connect');

    } catch (error) {
      console.error(error);
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
    this.subscribers.set(chatId, callback);
  }

  unsubscribe(chatId) {
    this.subscribers.delete(chatId);
  }

updateToken(newToken) {
    this.token = newToken;
    if (this.stream) {
      this.disconnect();
      this.userId = localStorage.getItem("user_id"); 
      this.startStream();
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.stream) { 
      this.stream.cancel();
      this.stream = null; 
    }
    this.connected = false;
    this.userId = null;
    this.token = null;
  }

  downloadFile(fileUrl, onProgress) {
    return new Promise((resolve, reject) => {
      if (!DownloadFileRequest || !FileServiceClient) {
        return reject("Components missing");
      }

      const client = new FileServiceClient(this.host, null, null);
      const request = new DownloadFileRequest();
      request.setFileUrl(fileUrl);

      const metadata = { authorization: `Bearer ${this.token}` };
      const stream = client.downloadFile(request, metadata);
      let chunks = [];

      stream.on("data", (response) => {
        const chunk = response.getChunk();
        chunks.push(chunk);
        if (onProgress) onProgress(chunks.length);
      });

      stream.on("end", () => {
        const blob = new Blob(chunks, { type: "application/octet-stream" });
        const downloadUrl = URL.createObjectURL(blob);
        resolve(downloadUrl);
      });

      stream.on("error", (err) => {
        reject(err);
      });
    });
  }

  isConnected() { return this.connected; }
  on(event, callback) { if (!this.listeners[event]) this.listeners[event] = []; this.listeners[event].push(callback); }
  off(event, callback) { if (!this.listeners[event]) return; this.listeners[event] = this.listeners[event].filter(cb => cb !== callback); }
  emit(event) { if (this.listeners[event]) this.listeners[event].forEach(cb => cb()); }
}

export const grpcClient = new GrpcClientService();