// Aplicação Principal Remote Desktop
class RemoteDesktopApp {
    constructor() {
        this.socket = null;
        this.clientId = null;
        this.connectedClients = new Map();
        this.currentConnection = null;
        this.settings = this.loadSettings();
        this.encryption = null;
        this.rsaKeyPair = null;
        this.sessionKeys = new Map();
        
        this.init();
    }
    
    async init() {
        try {
            // Obter informações do sistema
            const systemInfo = await window.electronAPI.getSystemInfo();
            this.systemInfo = systemInfo;
            
            // Gerar ID do cliente
            this.clientId = await window.electronAPI.getClientId();
            document.getElementById('clientId').textContent = this.clientId;
            
            // Mostrar branding PANIDESK
            this.showPanideskBranding();
            
            // Inicializar criptografia
            await this.initializeEncryption();
            
            // Inicializar UI
            this.initUI();
            this.initEventListeners();
            
            // Conectar ao servidor
            this.connectToServer();
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showNotification('Erro ao inicializar a aplicação', 'error');
        }
    }
    
    showPanideskBranding() {
        // Adicionar classe especial pro branding
        document.body.classList.add('panidesk-theme');
        
        // Adicionar tagline divertida
        const navBrand = document.querySelector('.nav-brand');
        if (navBrand) {
            const tagline = document.createElement('div');
            tagline.className = 'panidesk-tagline';
            tagline.textContent = 'Conecta quem tá PANO pra distância! 💻⚡';
            navBrand.parentNode.appendChild(tagline);
        }
    }
    
    async initializeEncryption() {
        if (window.E2EEncryption) {
            this.encryption = new E2EEncryption();
            
            // Gerar par de chaves RSA
            try {
                this.rsaKeyPair = await this.encryption.generateRSAKeyPair();
                console.log('Sistema de criptografia inicializado');
            } catch (error) {
                console.error('Erro ao inicializar criptografia:', error);
            }
        }
    }
    
    initUI() {
        // Navegação
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.showSection(section);
                
                // Atualizar botão ativo
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Copiar ID
        document.getElementById('copyIdBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(this.clientId).then(() => {
                this.showNotification('ID copiado para a área de transferência', 'success');
            });
        });
        
        // Atualizar lista de clientes
        document.getElementById('refreshBtn').addEventListener('click', () => {
            this.refreshClientsList();
        });
    }
    
    initEventListeners() {
        // Modal de conexão
        document.getElementById('connectBtn').addEventListener('click', () => {
            this.showModal('connectionModal');
        });
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideModal('connectionModal');
        });
        
        document.getElementById('cancelConnectionBtn').addEventListener('click', () => {
            this.hideModal('connectionModal');
        });
        
        document.getElementById('confirmConnectionBtn').addEventListener('click', () => {
            this.initiateConnection();
        });
        
        // Modal de configurações do servidor
        document.getElementById('serverSettingsBtn').addEventListener('click', () => {
            this.showModal('serverModal');
        });
        
        document.getElementById('closeServerModalBtn').addEventListener('click', () => {
            this.hideModal('serverModal');
        });
        
        document.getElementById('cancelServerBtn').addEventListener('click', () => {
            this.hideModal('serverModal');
        });
        
        document.getElementById('saveServerBtn').addEventListener('click', () => {
            this.saveServerSettings();
        });
        
        document.getElementById('testConnectionBtn').addEventListener('click', () => {
            this.testServerConnection();
        });
        
        // Configurações
        document.getElementById('saveSettingsBtn').addEventListener('click', () => {
            this.saveSettings();
        });
        
        document.getElementById('resetSettingsBtn').addEventListener('click', () => {
            this.resetSettings();
        });
        
        // Toggle de senha
        document.getElementById('requirePassword').addEventListener('change', (e) => {
            const passwordField = document.getElementById('passwordField');
            passwordField.style.display = e.target.checked ? 'flex' : 'none';
        });
        
        // Escala de controle remoto
        const scaleRange = document.getElementById('scaleRange');
        const scaleValue = document.getElementById('scaleValue');
        scaleRange.addEventListener('input', (e) => {
            scaleValue.textContent = e.target.value + '%';
        });
        
        const remoteScale = document.getElementById('remoteScale');
        const remoteScaleValue = document.getElementById('remoteScaleValue');
        remoteScale.addEventListener('input', (e) => {
            remoteScaleValue.textContent = e.target.value + '%';
        });
    }
    
    connectToServer() {
        const serverUrl = this.settings.serverUrl || 'http://localhost:3001';
        
        this.updateConnectionStatus('connecting', 'Conectando...');
        
        try {
            this.socket = window.socketAPI.connect(serverUrl);
            this.setupSocketListeners();
        } catch (error) {
            console.error('Erro ao conectar ao servidor:', error);
            this.updateConnectionStatus('offline', 'Erro de conexão');
        }
    }
    
    setupSocketListeners() {
        // Conexão estabelecida
        this.socket.on('connect', () => {
            console.log('Conectado ao servidor');
            this.updateConnectionStatus('online', 'Conectado');
            
            // Registrar cliente
            let registrationData = {
                clientId: this.clientId,
                name: `${this.systemInfo.username} - ${this.systemInfo.hostname}`,
                platform: this.systemInfo.platform,
                supportsEncryption: false
            };
            
            // Adicionar chave pública se criptografia estiver disponível
            if (this.encryption && this.rsaKeyPair) {
                try {
                    const publicKey = await this.encryption.exportPublicKey(this.rsaKeyPair.publicKey);
                    registrationData.publicKey = publicKey;
                    registrationData.supportsEncryption = true;
                } catch (error) {
                    console.error('Erro ao exportar chave pública:', error);
                }
            }
            
            this.socket.emit('register-client', registrationData);
        });
        
        // Cliente registrado
        this.socket.on('client-registered', (data) => {
            console.log('Cliente registrado:', data.clientId);
            this.clientId = data.clientId;
            document.getElementById('clientId').textContent = this.clientId;
        });
        
        // Lista de clientes
        this.socket.on('clients-list', (clients) => {
            this.updateClientsList(clients);
        });
        
        // Cliente conectado
        this.socket.on('client-connected', (clientInfo) => {
            this.connectedClients.set(clientInfo.id, clientInfo);
            this.updateClientsListUI();
        });
        
        // Cliente desconectado
        this.socket.on('client-disconnected', (data) => {
            this.connectedClients.delete(data.clientId);
            this.updateClientsListUI();
        });
        
        // Solicitação de conexão
        this.socket.on('connection-request', (data) => {
            this.handleConnectionRequest(data);
        });
        
        // Resposta de conexão
        this.socket.on('connection-accepted', (data) => {
            this.handleConnectionAccepted(data);
        });
        
        this.socket.on('connection-rejected', (data) => {
            this.showNotification('Conexão recusada: ' + data.message, 'error');
        });
        
        this.socket.on('connection-error', (data) => {
            this.showNotification('Erro de conexão: ' + data.message, 'error');
        });
        
        // Desconexão
        this.socket.on('disconnect', () => {
            console.log('Desconectado do servidor');
            this.updateConnectionStatus('offline', 'Desconectado');
            this.connectedClients.clear();
            this.updateClientsListUI();
        });
        
        // Erro
        this.socket.on('error', (error) => {
            console.error('Erro do socket:', error);
            this.showNotification('Erro de comunicação', 'error');
        });
        
        // Eventos de criptografia
        this.socket.on('crypto-handshake', async (data) => {
            await this.handleCryptoHandshake(data);
        });
        
        this.socket.on('session-key', async (data) => {
            await this.handleSessionKey(data);
        });
        
        this.socket.on('encrypted-message', async (data) => {
            if (window.chat) {
                await window.chat.receiveEncryptedMessage(data.encryptedData, data.from);
            }
        });
        
        this.socket.on('crypto-error', (data) => {
            this.showNotification('Erro de criptografia: ' + data.message, 'error');
        });
    }
    
    showSection(sectionId) {
        const sections = document.querySelectorAll('.content-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });
        
        document.getElementById(sectionId).classList.add('active');
    }
    
    updateConnectionStatus(status, text) {
        const statusIndicator = document.getElementById('connectionStatus');
        const statusDot = statusIndicator.querySelector('.status-dot');
        const statusText = statusIndicator.querySelector('.status-text');
        
        statusDot.className = 'status-dot ' + status;
        statusText.textContent = text;
        
        // Atualizar status do servidor
        document.getElementById('serverStatus').textContent = text;
    }
    
    updateClientsList(clients) {
        this.connectedClients.clear();
        clients.forEach(client => {
            this.connectedClients.set(client.id, client);
        });
        this.updateClientsListUI();
    }
    
    updateClientsListUI() {
        const clientsList = document.getElementById('clientsList');
        
        if (this.connectedClients.size === 0) {
            clientsList.innerHTML = `
                <div class="no-clients">
                    <i class="fas fa-users-slash"></i>
                    <p>Nenhum cliente conectado</p>
                    <small>Aguardando conexões...</small>
                </div>
            `;
            return;
        }
        
        clientsList.innerHTML = '';
        this.connectedClients.forEach(client => {
            const clientCard = this.createClientCard(client);
            clientsList.appendChild(clientCard);
        });
    }
    
    createClientCard(client) {
        const card = document.createElement('div');
        card.className = 'client-card';
        card.innerHTML = `
            <div class="client-header">
                <div class="client-name">${client.name}</div>
                <div class="client-status">
                    <i class="fas fa-circle"></i>
                    <span>Online</span>
                </div>
            </div>
            <div class="client-info">
                <div><strong>ID:</strong> ${client.id.substring(0, 16)}...</div>
                <div><strong>Plataforma:</strong> ${client.platform}</div>
                <div><strong>IP:</strong> ${client.ip}</div>
                <div><strong>Última vez:</strong> ${new Date(client.lastSeen).toLocaleTimeString()}</div>
            </div>
            <div class="client-actions">
                <button class="btn btn-primary connect-client-btn" data-client-id="${client.id}">
                    <i class="fas fa-plug"></i>
                    Conectar
                </button>
                <button class="btn btn-secondary remote-control-btn" data-client-id="${client.id}">
                    <i class="fas fa-tv"></i>
                    Controle
                </button>
            </div>
        `;
        
        // Event listeners
        card.querySelector('.connect-client-btn').addEventListener('click', () => {
            this.connectToClient(client.id);
        });
        
        card.querySelector('.remote-control-btn').addEventListener('click', () => {
            this.startRemoteControl(client.id);
        });
        
        return card;
    }
    
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }
    
    initiateConnection() {
        const targetId = document.getElementById('targetId').value.trim();
        const connectionName = document.getElementById('connectionName').value.trim();
        
        if (!targetId) {
            this.showNotification('Por favor, insira o ID do cliente', 'error');
            return;
        }
        
        this.connectToClient(targetId, connectionName);
        this.hideModal('connectionModal');
        
        // Limpar campos
        document.getElementById('targetId').value = '';
        document.getElementById('connectionName').value = '';
    }
    
    async connectToClient(clientId, connectionName = null) {
        if (!this.socket || !this.socket.connected()) {
            this.showNotification('Não conectado ao servidor', 'error');
            return;
        }
        
        this.socket.emit('connection-request', {
            targetId: clientId,
            requesterId: this.clientId,
            name: connectionName
        });
        
        // Armazenar ID do cliente para conexão
        this.currentConnection = clientId;
        
        // Iniciar handshake de criptografia se suportado
        if (this.encryption && this.rsaKeyPair) {
            const targetClient = this.connectedClients.get(clientId);
            if (targetClient && targetClient.supportsEncryption) {
                try {
                    const publicKey = await this.encryption.exportPublicKey(this.rsaKeyPair.publicKey);
                    
                    this.socket.emit('crypto-handshake', {
                        targetId: clientId,
                        publicKey: publicKey
                    });
                    
                    this.showNotification('Iniciando handshake de criptografia...', 'info');
                } catch (error) {
                    console.error('Erro ao iniciar handshake:', error);
                }
            }
        }
        
        this.showNotification('Solicitação de conexão enviada', 'info');
    }
    
    handleConnectionRequest(data) {
        const client = this.connectedClients.get(data.requesterId);
        const clientName = client ? client.name : 'Cliente desconhecido';
        
        window.electronAPI.showMessageBox({
            type: 'question',
            title: 'Solicitação de Conexão',
            message: `${clientName} está solicitando conexão`,
            detail: 'Deseja aceitar a conexão?',
            buttons: ['Aceitar', 'Recusar']
        }).then(result => {
            const accepted = result.response === 0;
            
            this.socket.emit('connection-response', {
                requesterSocketId: data.requesterSocketId,
                accepted: accepted
            });
            
            if (accepted) {
                this.currentConnection = data.requesterId;
                this.showNotification('Conexão aceita', 'success');
                this.enableConnectionFeatures();
            }
        });
    }
    
    handleConnectionAccepted(data) {
        this.showNotification('Conexão estabelecida com sucesso', 'success');
        this.enableConnectionFeatures();
    }
    
    enableConnectionFeatures() {
        // Habilitar botões de controle remoto
        document.getElementById('startRemoteBtn').disabled = false;
        document.getElementById('stopRemoteBtn').disabled = false;
        
        // Habilitar transferência de arquivos
        document.getElementById('sendFileBtn').disabled = false;
        document.getElementById('receiveFileBtn').disabled = false;
        
        // Habilitar chat
        document.getElementById('chatInput').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;
    }
    
    startRemoteControl(clientId) {
        this.showSection('remote-control');
        // Implementar controle remoto
        if (window.remoteControl) {
            window.remoteControl.start(clientId);
        }
    }
    
    refreshClientsList() {
        if (this.socket && this.socket.connected()) {
            // Solicitar atualização da lista
            this.socket.emit('ping');
            this.showNotification('Lista atualizada', 'success');
        } else {
            this.showNotification('Não conectado ao servidor', 'error');
        }
    }
    
    saveServerSettings() {
        const serverUrl = document.getElementById('modalServerUrl').value.trim();
        
        if (!serverUrl) {
            this.showNotification('URL do servidor inválida', 'error');
            return;
        }
        
        this.settings.serverUrl = serverUrl;
        document.getElementById('serverUrl').value = serverUrl;
        
        this.saveSettingsToStorage();
        this.hideModal('serverModal');
        this.showNotification('Configurações do servidor salvas', 'success');
        
        // Reconectar com novo servidor
        if (this.socket) {
            this.socket.disconnect();
        }
        this.connectToServer();
    }
    
    async testServerConnection() {
        const serverUrl = document.getElementById('modalServerUrl').value.trim();
        const testResult = document.getElementById('testResult');
        
        if (!serverUrl) {
            testResult.textContent = 'URL inválida';
            testResult.className = 'text-danger';
            return;
        }
        
        testResult.textContent = 'Testando...';
        testResult.className = 'text-warning';
        
        try {
            const response = await fetch(serverUrl + '/test', { method: 'GET' });
            if (response.ok) {
                testResult.textContent = 'Conexão bem-sucedida';
                testResult.className = 'text-success';
            } else {
                testResult.textContent = 'Erro na conexão';
                testResult.className = 'text-danger';
            }
        } catch (error) {
            testResult.textContent = 'Erro na conexão';
            testResult.className = 'text-danger';
        }
    }
    
    saveSettings() {
        const settings = {
            serverUrl: document.getElementById('serverUrl').value.trim(),
            autoConnect: document.getElementById('autoConnect').checked,
            remoteQuality: document.getElementById('remoteQuality').value,
            remoteScale: document.getElementById('remoteScale').value,
            requirePassword: document.getElementById('requirePassword').checked,
            connectionPassword: document.getElementById('connectionPassword').value
        };
        
        this.settings = settings;
        this.saveSettingsToStorage();
        this.showNotification('Configurações salvas com sucesso', 'success');
    }
    
    resetSettings() {
        window.electronAPI.showMessageBox({
            type: 'question',
            title: 'Confirmar',
            message: 'Restaurar configurações padrão?',
            detail: 'Todas as configurações serão perdidas.',
            buttons: ['Sim', 'Não']
        }).then(result => {
            if (result.response === 0) {
                this.settings = this.getDefaultSettings();
                this.saveSettingsToStorage();
                this.loadSettingsUI();
                this.showNotification('Configurações restauradas', 'success');
            }
        });
    }
    
    loadSettings() {
        const saved = localStorage.getItem('remoteDesktopSettings');
        return saved ? JSON.parse(saved) : this.getDefaultSettings();
    }
    
    getDefaultSettings() {
        return {
            serverUrl: 'http://localhost:3001',
            autoConnect: true,
            remoteQuality: 'medium',
            remoteScale: '100',
            requirePassword: false,
            connectionPassword: ''
        };
    }
    
    saveSettingsToStorage() {
        localStorage.setItem('remoteDesktopSettings', JSON.stringify(this.settings));
    }
    
    loadSettingsUI() {
        document.getElementById('serverUrl').value = this.settings.serverUrl;
        document.getElementById('autoConnect').checked = this.settings.autoConnect;
        document.getElementById('remoteQuality').value = this.settings.remoteQuality;
        document.getElementById('remoteScale').value = this.settings.remoteScale;
        document.getElementById('requirePassword').checked = this.settings.requirePassword;
        document.getElementById('connectionPassword').value = this.settings.connectionPassword;
        
        // Toggle password field
        const passwordField = document.getElementById('passwordField');
        passwordField.style.display = this.settings.requirePassword ? 'flex' : 'none';
    }
    
    async handleCryptoHandshake(data) {
        const { requesterId, requesterPublicKey } = data;
        
        if (!this.encryption || !this.rsaKeyPair) {
            this.showNotification('Criptografia não disponível', 'error');
            return;
        }
        
        try {
            // Importar chave pública do solicitante
            const publicKey = await this.encryption.importPublicKey(requesterPublicKey);
            
            // Gerar chave de sessão
            const sessionKey = await this.encryption.generateSessionKey();
            
            // Criptografar chave de sessão com chave pública do solicitante
            const encryptedSessionKey = await this.encryption.encryptSessionKey(
                sessionKey, 
                publicKey
            );
            
            // Enviar chave de sessão criptografada de volta
            this.socket.emit('session-key', {
                requesterId: requesterId,
                encryptedSessionKey: encryptedSessionKey
            });
            
            // Armazenar chave de sessão para uso futuro
            this.sessionKeys.set(requesterId, sessionKey);
            
            // Atualizar módulos com a chave de sessão
            if (window.remoteControl) {
                window.remoteControl.sessionPassword = await this.exportSessionKey(sessionKey);
            }
            if (window.fileTransfer) {
                window.fileTransfer.sessionPassword = await this.exportSessionKey(sessionKey);
            }
            if (window.chat) {
                window.chat.sessionPassword = await this.exportSessionKey(sessionKey);
            }
            
            this.showNotification('Handshake de criptografia completado', 'success');
            
        } catch (error) {
            console.error('Erro no handshake de criptografia:', error);
            this.showNotification('Erro no handshake de criptografia', 'error');
        }
    }
    
    async handleSessionKey(data) {
        const { encryptedSessionKey, from } = data;
        
        if (!this.encryption || !this.rsaKeyPair) {
            this.showNotification('Criptografia não disponível', 'error');
            return;
        }
        
        try {
            // Descriptografar chave de sessão com nossa chave privada
            const sessionKey = await this.encryption.decryptSessionKey(
                encryptedSessionKey, 
                this.rsaKeyPair.privateKey
            );
            
            // Armazenar chave de sessão
            this.sessionKeys.set(from, sessionKey);
            
            // Atualizar módulos com a chave de sessão
            const sessionPassword = await this.exportSessionKey(sessionKey);
            
            if (window.remoteControl) {
                window.remoteControl.sessionPassword = sessionPassword;
            }
            if (window.fileTransfer) {
                window.fileTransfer.sessionPassword = sessionPassword;
            }
            if (window.chat) {
                window.chat.sessionPassword = sessionPassword;
            }
            
            this.showNotification('Chave de sessão estabelecida', 'success');
            
        } catch (error) {
            console.error('Erro ao receber chave de sessão:', error);
            this.showNotification('Erro ao receber chave de sessão', 'error');
        }
    }
    
    async exportSessionKey(sessionKey) {
        // Exportar chave de sessão para string
        const exported = await crypto.subtle.exportKey('raw', sessionKey);
        return Array.from(new Uint8Array(exported))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    
    showNotification(message, type = 'info') {
        // Mensagens divertidas do PANIDESK
        const panideskMessages = {
            'connected': '🎉 Conectado! Agora é só mandar ver!',
            'disconnected': '😢 Desconectado... Mas volta logo!',
            'file-sent': '📁 Arquivo enviado! Voou que nem PANO!',
            'file-received': '📁 Arquivo recebido! Caiu que nem MAMÃO!',
            'connection-request': '🤝 Pedido de conexão! Aceita ou não?',
            'connection-accepted': '✅ Conexão aceita! Bora trabalhar!',
            'connection-rejected': '❌ Conexão recusada! Não foi dessa vez!',
            'encryption-enabled': '🔐 Criptografia ativada! Segurança em dia!',
            'chat-message': '💬 Nova mensagem! Fala tu!'
        };
        
        // Substituir mensagens padrão pelas divertidas
        if (panideskMessages[type]) {
            message = panideskMessages[type];
        }
        
        // Cores do PANIDESK
        const panideskColors = {
            'success': '#00d4aa',  // Verde NEON
            'error': '#ff1744',    // Vermelho IRADO
            'info': '#ff6b35',     // Laranja PANO
            'warning': '#ffc107'   // Amarelo
        };
        
        // Criar notificação toast estilo PANIDESK
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} panidesk-toast`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-icon">${this.getPanideskIcon(type)}</span>
                <span class="toast-message">${message}</span>
            </div>
            <div class="toast-progress"></div>
        `;
        
        // Estilos do toast PANIDESK
        Object.assign(toast.style, {
            position: 'fixed',
            top: '90px',
            right: '20px',
            background: panideskColors[type] || panideskColors.info,
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
            zIndex: '1001',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.9rem',
            fontWeight: '600',
            maxWidth: '350px',
            transform: 'translateX(100%)',
            transition: 'all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
        });
        
        document.body.appendChild(toast);
        
        // Animação de entrada
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Adicionar classe de animação especial
        if (type === 'success') {
            toast.classList.add('pano-success');
        } else if (type === 'error') {
            toast.classList.add('pano-error');
        }
        
        // Remover após 4 segundos
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 400);
        }, 4000);
    }
    
    getPanideskIcon(type) {
        const icons = {
            'success': '✅',
            'error': '❌',
            'info': '💡',
            'warning': '⚠️'
        };
        return icons[type] || '📢';
    }
        // Criar notificação toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        // Estilos do toast
        Object.assign(toast.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: '1001',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            animation: 'slideInRight 0.3s ease'
        });
        
        document.body.appendChild(toast);
        
        // Remover após 3 segundos
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
}

// Inicializar aplicação qua