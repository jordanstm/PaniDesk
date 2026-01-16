const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static('public'));

// Configuração de upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// Endpoint para upload de arquivos
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }
  
  res.json({
    success: true,
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size
  });
});

// Endpoint para download de arquivos
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Armazenamento de clientes conectados
const connectedClients = new Map();

// Armazenamento de chaves públicas para criptografia
const clientPublicKeys = new Map();
const sessionKeys = new Map();

io.on('connection', (socket) => {
  console.log(`Cliente conectado: ${socket.id}`);
  
  // Registrar cliente
  socket.on('register-client', (data) => {
    const clientId = data.clientId || uuidv4();
    const clientInfo = {
      id: clientId,
      socketId: socket.id,
      name: data.name || `Cliente ${clientId.substring(0, 8)}`,
      isAvailable: true,
      ip: socket.handshake.address,
      platform: data.platform || 'unknown',
      lastSeen: new Date(),
      supportsEncryption: data.supportsEncryption || false
    };
    
    connectedClients.set(clientId, clientInfo);
    socket.clientId = clientId;
    
    // Armazenar chave pública se fornecida
    if (data.publicKey) {
      clientPublicKeys.set(clientId, data.publicKey);
      clientInfo.supportsEncryption = true;
    }
    
    // Enviar ID do cliente de volta
    socket.emit('client-registered', { 
      clientId,
      serverSupportsEncryption: true
    });
    
    // Notificar outros clientes sobre a nova conexão
    socket.broadcast.emit('client-connected', clientInfo);
    
    // Enviar lista de clientes conectados
    const clientsList = Array.from(connectedClients.values()).filter(c => c.id !== clientId);
    socket.emit('clients-list', clientsList);
    
    console.log(`Cliente registrado: ${clientId} - ${clientInfo.name} (Encryption: ${clientInfo.supportsEncryption})`);
  });
  
  // Solicitação de conexão
  socket.on('connection-request', (data) => {
    const { targetId, requesterId } = data;
    const targetClient = connectedClients.get(targetId);
    
    if (targetClient) {
      io.to(targetClient.socketId).emit('connection-request', {
        requesterId,
        requesterSocketId: socket.id,
        timestamp: new Date()
      });
    } else {
      socket.emit('connection-error', { message: 'Cliente não encontrado ou offline' });
    }
  });
  
  // Resposta à solicitação de conexão
  socket.on('connection-response', (data) => {
    const { requesterSocketId, accepted } = data;
    
    if (accepted) {
      // Criar sala de conexão
      const roomId = uuidv4();
      socket.join(roomId);
      io.to(requesterSocketId).emit('connection-accepted', { roomId });
      io.to(requesterSocketId).join(roomId);
      
      console.log(`Conexão estabelecida na sala: ${roomId}`);
    } else {
      io.to(requesterSocketId).emit('connection-rejected', { message: 'Conexão recusada pelo cliente' });
    }
  });
  
  // Oferta WebRTC
  socket.on('webrtc-offer', (data) => {
    socket.to(data.roomId).emit('webrtc-offer', {
      offer: data.offer,
      from: socket.id
    });
  });
  
  // Resposta WebRTC
  socket.on('webrtc-answer', (data) => {
    socket.to(data.roomId).emit('webrtc-answer', {
      answer: data.answer,
      from: socket.id
    });
  });
  
  // Candidato ICE
  socket.on('ice-candidate', (data) => {
    socket.to(data.roomId).emit('ice-candidate', {
      candidate: data.candidate,
      from: socket.id
    });
  });
  
  // Controle remoto
  socket.on('remote-control', (data) => {
    socket.to(data.roomId).emit('remote-control', data);
  });
  
  // Transferência de arquivo
  socket.on('file-transfer-request', (data) => {
    socket.to(data.roomId).emit('file-transfer-request', data);
  });
  
  socket.on('file-transfer-response', (data) => {
    socket.to(data.roomId).emit('file-transfer-response', data);
  });
  
  // Chat
  socket.on('chat-message', (data) => {
    const message = {
      ...data,
      timestamp: new Date(),
      from: socket.clientId
    };
    socket.to(data.roomId).emit('chat-message', message);
  });
  
  // Handshake de criptografia
  socket.on('crypto-handshake', (data) => {
    const { targetId, publicKey } = data;
    const targetClient = connectedClients.get(targetId);
    
    if (targetClient && targetClient.supportsEncryption) {
      // Encaminhar chave pública para o cliente alvo
      io.to(targetClient.socketId).emit('crypto-handshake', {
        requesterId: socket.clientId,
        requesterPublicKey: publicKey
      });
    } else {
      socket.emit('crypto-error', { 
        message: 'Cliente não suporta criptografia ou não encontrado' 
      });
    }
  });
  
  // Receber chave de sessão criptografada
  socket.on('session-key', (data) => {
    const { requesterId, encryptedSessionKey } = data;
    const requesterClient = connectedClients.get(requesterId);
    
    if (requesterClient) {
      // Encaminhar chave de sessão para o solicitante
      io.to(requesterClient.socketId).emit('session-key', {
        encryptedSessionKey: encryptedSessionKey,
        from: socket.clientId
      });
    }
  });
  
  // Mensagem criptografada
  socket.on('encrypted-message', (data) => {
    const { targetId, encryptedData } = data;
    const targetClient = connectedClients.get(targetId);
    
    if (targetClient) {
      io.to(targetClient.socketId).emit('encrypted-message', {
        encryptedData: encryptedData,
        from: socket.clientId,
        timestamp: new Date()
      });
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
    
    if (socket.clientId) {
      const clientInfo = connectedClients.get(socket.clientId);
      if (clientInfo) {
        connectedClients.delete(socket.clientId);
        socket.broadcast.emit('client-disconnected', { clientId: socket.clientId });
        console.log(`Cliente removido: ${socket.clientId}`);
      }
    }
  });
  
  // Keep alive
  socket.on('ping', () => {
    socket.emit('pong');
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor de sinalização rodando na porta ${PORT}`);
});