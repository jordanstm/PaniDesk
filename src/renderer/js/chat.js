// Chat Integrado com Criptografia
class Chat {
    constructor() {
        this.messages = [];
        this.currentConnection = null;
        this.unreadCount = 0;
        this.encryption = null;
        this.sessionPassword = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadChatHistory();
        this.initializeEncryption();
    }
    
    initializeEncryption() {
        // Aguardar carregamento do módulo de criptografia
        if (window.E2EEncryption) {
            this.encryption = new E2EEncryption();
            
            // Gerar senha de sessão
            this.sessionPassword = this.generateSessionPassword();
        }
    }
    
    generateSessionPassword() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    setupEventListeners() {
        // Input de mensagem
        const chatInput = document.getElementById('chatInput');
        const sendButton = document.getElementById('sendMessageBtn');
        
        sendButton.addEventListener('click', () => {
            this.sendMessage();
        });
        
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Limpar chat
        document.getElementById('clearChatBtn').addEventListener('click', () => {
            this.clearChat();
        });
        
        // Focar no input quando a aba de chat é selecionada
        document.querySelector('[data-section="chat"]').addEventListener('click', () => {
            setTimeout(() => {
                chatInput.focus();
            }, 100);
        });
    }
    
    async sendMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        if (!window.remoteDesktopApp || !window.remoteDesktopApp.socket) {
            this.showSystemMessage('Não conectado ao servidor', 'error');
            return;
        }
        
        const messageData = {
            id: this.generateMessageId(),
            text: message,
            timestamp: new Date(),
            from: window.remoteDesktopApp.clientId,
            type: 'text',
            encrypted: false
        };
        
        // Adicionar à lista local
        this.addMessage(messageData, true);
        
        // Se houver criptografia, enviar mensagem criptografada
        if (this.encryption && this.sessionPassword) {
            try {
                const encrypted = await this.encryption.encrypt(
                    { text: message },
                    this.sessionPassword
                );
                
                if (encrypted.success) {
                    // Enviar mensagem criptografada
                    window.remoteDesktopApp.socket.emit('encrypted-message', {
                        targetId: window.remoteDesktopApp.currentConnection,
                        encryptedData: {
                            originalId: messageData.id,
                            encryptedContent: encrypted.encryptedData,
                            timestamp: messageData.timestamp,
                            type: 'chat'
                        }
                    });
                    
                    // Marcar como criptografada
                    messageData.encrypted = true;
                } else {
                    console.error('Falha ao criptografar mensagem');
                }
            } catch (error) {
                console.error('Erro ao criptografar mensagem:', error);
                // Fallback para mensagem não criptografada
                this.sendUnencryptedMessage(messageData);
            }
        } else {
            // Enviar mensagem não criptografada
            this.sendUnencryptedMessage(messageData);
        }
        
        // Limpar input
        input.value = '';
    }
    
    sendUnencryptedMessage(messageData) {
        // Enviar pelo socket
        window.remoteDesktopApp.socket.emit('chat-message', {
            roomId: this.getCurrentRoomId(),
            message: messageData
        });
    }
    
    async receiveMessage(messageData) {
        // Adicionar mensagem recebida
        this.addMessage(messageData, false);
        
        // Notificar se não estiver na aba de chat
        if (!this.isChatVisible()) {
            this.unreadCount++;
            this.updateUnreadBadge();
            
            // Notificar
            if (window.remoteDesktopApp) {
                window.remoteDesktopApp.showNotification(`Nova mensagem de ${messageData.from}`, 'info');
            }
        }
    }
    
    async receiveEncryptedMessage(encryptedData, from) {
        if (!this.encryption || !this.sessionPassword) {
            console.error('Criptografia não inicializada');
            return;
        }
        
        try {
            const decrypted = await this.encryption.decrypt(
                encryptedData.encryptedContent,
                this.sessionPassword
            );
            
            if (decrypted.success) {
                const messageData = {
                    id: encryptedData.originalId,
                    text: decrypted.decryptedData.text,
                    timestamp: encryptedData.timestamp,
                    from: from,
                    type: 'text',
                    encrypted: true
                };
                
                this.addMessage(messageData, false);
                
                // Notificar
                if (!this.isChatVisible()) {
                    this.unreadCount++;
                    this.updateUnreadBadge();
                    
                    if (window.remoteDesktopApp) {
                        window.remoteDesktopApp.showNotification(`Nova mensagem criptografada de ${from}`, 'info');
                    }
                }
            } else {
                console.error('Falha ao descriptografar mensagem');
            }
        } catch (error) {
            console.error('Erro ao descriptografar mensagem:', error);
        }
    }
    
    addMessage(messageData, isOwn = false) {
        const messagesContainer = document.getElementById('chatMessages');
        
        // Remover mensagem de boas-vindas se for a primeira mensagem
        const welcomeMessage = messagesContainer.querySelector('.chat-welcome');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageElement = this.createMessageElement(messageData, isOwn);
        
        // Adicionar ao container
        messagesContainer.appendChild(messageElement);
        
        // Adicionar à lista
        this.messages.push(messageData);
        
        // Scroll para a última mensagem
        this.scrollToBottom();
        
        // Salvar histórico
        this.saveChatHistory();
    }
    
    createMessageElement(messageData, isOwn = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isOwn ? 'own' : ''}`;
        
        const time = new Date(messageData.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Avatar (primeira letra do ID ou nome)
        const avatar = isOwn ? 'Você' : (messageData.from || '?').charAt(0).toUpperCase();
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-sender">${isOwn ? 'Você' : (messageData.from || 'Desconhecido')}</span>
                    <span class="message-time">${time}</span>
                </div>
                <div class="message-text">${this.escapeHtml(messageData.text)}</div>
            </div>
        `;
        
        // Adicionar eventos
        this.addMessageEvents(messageDiv, messageData);
        
        return messageDiv;
    }
    
    addMessageEvents(messageElement, messageData) {
        // Menu de contexto
        messageElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showMessageContextMenu(e, messageData);
        });
        
        // Clique duplo para copiar
        messageElement.addEventListener('dblclick', () => {
            navigator.clipboard.writeText(messageData.text).then(() => {
                if (window.remoteDesktopApp) {
                    window.remoteDesktopApp.showNotification('Mensagem copiada', 'success');
                }
            });
        });
    }
    
    showMessageContextMenu(event, messageData) {
        // Remover menu existente
        const existingMenu = document.querySelector('.message-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }
        
        // Criar menu
        const menu = document.createElement('div');
        menu.className = 'message-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${event.clientX}px;
            top: ${event.clientY}px;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            z-index: 1002;
            padding: 0.5rem 0;
            min-width: 150px;
        `;
        
        const options = [
            { label: 'Copiar', icon: 'fas fa-copy', action: () => {
                navigator.clipboard.writeText(messageData.text);
                if (window.remoteDesktopApp) {
                    window.remoteDesktopApp.showNotification('Mensagem copiada', 'success');
                }
            }},
            { label: 'Responder', icon: 'fas fa-reply', action: () => {
                const input = document.getElementById('chatInput');
                input.value = `@${messageData.from} `;
                input.focus();
            }},
            { label: 'Excluir', icon: 'fas fa-trash', action: () => {
                this.deleteMessage(messageData.id);
            }}
        ];
        
        options.forEach(option => {
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.style.cssText = `
                padding: 0.5rem 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
            `;
            item.innerHTML = `
                <i class="${option.icon}"></i>
                <span>${option.label}</span>
            `;
            
            item.addEventListener('click', () => {
                option.action();
                menu.remove();
            });
            
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f1f5f9';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            
            menu.appendChild(item);
        });
        
        document.body.appendChild(menu);
        
        // Fechar ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', function closeMenu() {
                if (menu.parentNode) {
                    menu.parentNode.removeChild(menu);
                }
                document.removeEventListener('click', closeMenu);
            });
        }, 100);
    }
    
    deleteMessage(messageId) {
        // Remover da lista
        this.messages = this.messages.filter(msg => msg.id !== messageId);
        
        // Remover do DOM
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.remove();
        }
        
        // Verificar se ainda há mensagens
        const messagesContainer = document.getElementById('chatMessages');
        if (messagesContainer.children.length === 0) {
            messagesContainer.innerHTML = `
                <div class="chat-welcome">
                    <i class="fas fa-comments"></i>
                    <p>Inicie uma conversa com um cliente conectado</p>
                </div>
            `;
        }
        
        // Salvar histórico
        this.saveChatHistory();
    }
    
    clearChat() {
        if (this.messages.length === 0) return;
        
        window.remoteDesktopApp.showMessageBox({
            type: 'question',
            title: 'Confirmar',
            message: 'Limpar histórico de chat?',
            detail: 'Todas as mensagens serão perdidas.',
            buttons: ['Sim', 'Não']
        }).then(result => {
            if (result.response === 0) {
                // Limpar mensagens
                this.messages = [];
                
                // Limpar DOM
                const messagesContainer = document.getElementById('chatMessages');
                messagesContainer.innerHTML = `
                    <div class="chat-welcome">
                        <i class="fas fa-comments"></i>
                        <p>Inicie uma conversa com um cliente conectado</p>
                    </div>
                `;
                
                // Limpar contador
                this.unreadCount = 0;
                this.updateUnreadBadge();
                
                // Salvar (vazio)
                this.saveChatHistory();
                
                if (window.remoteDesktopApp) {
                    window.remoteDesktopApp.showNotification('Chat limpo', 'success');
                }
            }
        });
    }
    
    showSystemMessage(text, type = 'info') {
        const messageData = {
            id: this.generateMessageId(),
            text: text,
            timestamp: new Date(),
            from: 'Sistema',
            type: 'system'
        };
        
        this.addMessage(messageData);
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    isChatVisible() {
        const chatSection = document.getElementById('chat');
        return chatSection.classList.contains('active');
    }
    
    updateUnreadBadge() {
        // Atualizar badge de notificações no menu
        const chatButton = document.querySelector('[data-section="chat"]');
        let badge = chatButton.querySelector('.unread-badge');
        
        if (this.unreadCount > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'unread-badge';
                badge.style.cssText = `
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    background: #ef4444;
                    color: white;
                    border-radius: 50%;
                    width: 18px;
                    height: 18px;
                    font-size: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                `;
                chatButton.style.position = 'relative';
                chatButton.appendChild(badge);
            }
            badge.textContent = this.unreadCount;
        } else if (badge) {
            badge.remove();
        }
    }
    
    getCurrentRoomId() {
        // Retornar ID da sala atual (simplificado)
        return window.remoteDesktopApp?.currentConnection || 'general';
    }
    
    generateMessageId() {
        return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    saveChatHistory() {
        const chatData = {
            messages: this.messages,
            timestamp: new Date()
        };
        
        localStorage.setItem('chatHistory', JSON.stringify(chatData));
    }
    
    loadChatHistory() {
        const saved = localStorage.getItem('chatHistory');
        if (saved) {
            const chatData = JSON.parse(saved);
            this.messages = chatData.messages || [];
            
            // Renderizar mensagens salvas
            this.messages.forEach(message => {
                const isOwn = message.from === window.remoteDesktopApp?.clientId;
                this.addMessage(message, isOwn);
            });
        }
    }
    
    // Método para enviar arquivos via chat (arrastar e soltar)
    handleFileDrop(files) {
        Array.from(files).forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // Limite de 10MB para arquivos no chat
                this.showSystemMessage('Arquivo muito grande para envio no chat (máx. 10MB)', 'error');
                return;
            }
            
            // Criar mensagem de arquivo
            const messageData = {
                id: this.generateMessageId(),
                text: `📎 ${file.name} (${this.formatFileSize(file.size)})`,
                timestamp: new Date(),
                from: window.remoteDesktopApp?.clientId,
                type: 'file',
                fileInfo: {
                    name: file.name,
                    size: file.size,
                    type: file.type
                }
            };
            
            this.addMessage(messageData, true);
            
            // Enviar arquivo (usar FileTransfer)
            if (window.fileTransfer) {
                window.fileTransfer.sendFile(file);
            }
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Adicionar estilos CSS para o chat
const style = document.createElement('style');
style.textContent = `
    .message {
        animation: fadeIn 0.3s ease;
    }
    
    .message.own {
        animation: slideInRight 0.3s ease;
    }
    
    .message:not(.own) {
        animation: slideInLeft 0.3s ease;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideInLeft {
        from { transform: translateX(-20px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .chat-messages {
        scroll-behavior: smooth;
    }
    
    .chat-messages::-webkit-scrollbar {
        width: 6px;
    }
    
    .chat-messages::-webkit-scrollbar-track {
        background: transparent;
    }
    
    .chat-messages::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
    }
    
    .chat-messages::-webkit-scrollbar-thumb:hover {
        background: #94a3b8;
    }
`;
document.head.appendChild(style);

// Inicializar chat
document.addEventListener('DOMContentLoaded', () => {
    window.chat = new Chat();
    
    // Configurar listeners do socket
    if (window.remoteDesktopApp) {
        const originalSetupListeners = window.remoteDesktopApp.setupSocketListeners;
        window.remoteDesktopApp.setupSocketListeners = function() {
            originalSetupListeners.call(this);
            
            // Adicionar listener de mensagens
            if (this.socket) {
                this.socket.on('chat-message', (data) => {
                    window.chat.receiveMessage(data.message);
                });
            }
        };
    }
    
    // Limpar badge de não lidas quando entrar na aba de chat
    document.querySelector('[data-section="chat"]').addEventListener('click', () => {
        window.chat.unreadCount = 0;
        window.chat.updateUnreadBadge();
    });
});