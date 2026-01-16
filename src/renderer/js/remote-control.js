// Controle Remoto com Criptografia
class RemoteControl {
    constructor() {
        this.isActive = false;
        this.currentStream = null;
        this.canvas = null;
        this.ctx = null;
        this.scale = 1;
        this.quality = 'medium';
        this.mouseTracking = false;
        this.keyboardTracking = false;
        this.encryption = null;
        this.sessionPassword = null;
        
        this.init();
    }
    
    init() {
        this.canvas = document.getElementById('remoteCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Configurar controles
        this.setupControls();
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
    
    setupControls() {
        // Controle de qualidade
        document.getElementById('qualitySelect').addEventListener('change', (e) => {
            this.quality = e.target.value;
            this.updateQuality();
        });
        
        // Controle de escala
        document.getElementById('scaleRange').addEventListener('input', (e) => {
            this.scale = parseInt(e.target.value) / 100;
            this.updateScale();
        });
        
        // Tela cheia
        document.getElementById('fullscreenBtn').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Botões de controle
        document.getElementById('startRemoteBtn').addEventListener('click', () => {
            this.start();
        });
        
        document.getElementById('stopRemoteBtn').addEventListener('click', () => {
            this.stop();
        });
        
        // Eventos do canvas
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseEvent(e, 'mousedown'));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseEvent(e, 'mouseup'));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseEvent(e, 'mousemove'));
        this.canvas.addEventListener('click', (e) => this.handleMouseEvent(e, 'click'));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleMouseEvent(e, 'rightclick');
        });
        
        // Teclado
        document.addEventListener('keydown', (e) => this.handleKeyboardEvent(e, 'keydown'));
        document.addEventListener('keyup', (e) => this.handleKeyboardEvent(e, 'keyup'));
    }
    
    start(clientId = null) {
        if (this.isActive) {
            console.log('Controle remoto já está ativo');
            return;
        }
        
        this.isActive = true;
        
        // Mostrar visualizador
        document.getElementById('remoteInfo').style.display = 'none';
        document.getElementById('remoteViewer').style.display = 'block';
        
        // Ativar tracking
        this.mouseTracking = true;
        this.keyboardTracking = true;
        
        // Iniciar captura de tela
        this.startScreenCapture();
        
        // Atualizar UI
        document.getElementById('startRemoteBtn').disabled = true;
        document.getElementById('stopRemoteBtn').disabled = false;
        
        if (window.remoteDesktopApp) {
            window.remoteDesktopApp.showNotification('Controle remoto iniciado', 'success');
        }
    }
    
    stop() {
        if (!this.isActive) {
            return;
        }
        
        this.isActive = false;
        this.mouseTracking = false;
        this.keyboardTracking = false;
        
        // Parar captura
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
        
        // Mostrar info
        document.getElementById('remoteInfo').style.display = 'block';
        document.getElementById('remoteViewer').style.display = 'none';
        
        // Atualizar UI
        document.getElementById('startRemoteBtn').disabled = false;
        document.getElementById('stopRemoteBtn').disabled = true;
        
        // Limpar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (window.remoteDesktopApp) {
            window.remoteDesktopApp.showNotification('Controle remoto parado', 'info');
        }
    }
    
    async startScreenCapture() {
        try {
            // Capturar tela (simulado - em produção usar desktopCapturer do Electron)
            const constraints = {
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: this.getFrameRate() }
                }
            };
            
            // Simular stream para demonstração
            this.simulateScreenStream();
            
        } catch (error) {
            console.error('Erro ao capturar tela:', error);
            if (window.remoteDesktopApp) {
                window.remoteDesktopApp.showNotification('Erro ao capturar tela', 'error');
            }
        }
    }
    
    simulateScreenStream() {
        // Simular frames de tela para demonstração
        let frameCount = 0;
        const drawFrame = () => {
            if (!this.isActive) return;
            
            // Criar imagem de demonstração
            this.ctx.fillStyle = '#2d3748';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Desenhar informações
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('REMOTE DESKTOP - TELA SIMULADA', this.canvas.width / 2, 50);
            
            this.ctx.font = '16px monospace';
            this.ctx.fillText(`Frame: ${frameCount}`, this.canvas.width / 2, 100);
            this.ctx.fillText(`Qualidade: ${this.quality}`, this.canvas.width / 2, 130);
            this.ctx.fillText(`Escala: ${Math.round(this.scale * 100)}%`, this.canvas.width / 2, 160);
            
            // Desenhar área de trabalho simulada
            this.ctx.fillStyle = '#1a202c';
            this.ctx.fillRect(20, 200, this.canvas.width - 40, this.canvas.height - 220);
            
            this.ctx.fillStyle = '#4a5568';
            this.ctx.fillRect(20, 200, this.canvas.width - 40, 40);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'left';
            this.ctx.fillText('Simulação de Área de Trabalho', 30, 225);
            
            // Ícones simulados
            this.drawDesktopIcons();
            
            frameCount++;
            setTimeout(drawFrame, 1000 / this.getFrameRate());
        };
        
        drawFrame();
    }
    
    drawDesktopIcons() {
        const icons = [
            { x: 50, y: 280, label: 'Arquivo 1' },
            { x: 150, y: 280, label: 'Arquivo 2' },
            { x: 250, y: 280, label: 'Pasta 1' },
            { x: 350, y: 280, label: 'App 1' }
        ];
        
        icons.forEach(icon => {
            // Ícone
            this.ctx.fillStyle = '#4299e1';
            this.ctx.fillRect(icon.x, icon.y, 40, 40);
            
            // Label
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(icon.label, icon.x + 20, icon.y + 55);
        });
    }
    
    getFrameRate() {
        switch (this.quality) {
            case 'low': return 15;
            case 'medium': return 30;
            case 'high': return 60;
            default: return 30;
        }
    }
    
    updateQuality() {
        if (window.remoteDesktopApp && window.remoteDesktopApp.socket) {
            window.remoteDesktopApp.socket.emit('remote-control', {
                action: 'set-quality',
                quality: this.quality
            });
        }
    }
    
    updateScale() {
        this.canvas.style.transform = `scale(${this.scale})`;
        this.canvas.style.transformOrigin = 'top left';
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.canvas.requestFullscreen().catch(err => {
                console.error('Erro ao ativar tela cheia:', err);
            });
        } else {
            document.exitFullscreen();
        }
    }
    
    handleMouseEvent(event, type) {
        if (!this.mouseTracking) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = Math.round((event.clientX - rect.left) * scaleX);
        const y = Math.round((event.clientY - rect.top) * scaleY);
        
        const mouseData = {
            action: 'mouse-event',
            type: type,
            x: x,
            y: y,
            button: event.button
        };
        
        this.sendRemoteEvent(mouseData);
        
        // Feedback visual
        if (type === 'mousedown' || type === 'click') {
            this.showClickFeedback(x, y);
        }
    }
    
    handleKeyboardEvent(event, type) {
        if (!this.keyboardTracking) return;
        
        // Prevenir comportamentos padrão para teclas especiais
        if (['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) {
            event.preventDefault();
        }
        
        const keyboardData = {
            action: 'keyboard-event',
            type: type,
            key: event.key,
            code: event.code,
            keyCode: event.keyCode,
            ctrlKey: event.ctrlKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            metaKey: event.metaKey
        };
        
        this.sendRemoteEvent(keyboardData);
    }
    
    async sendRemoteEvent(data) {
        if (window.remoteDesktopApp && window.remoteDesktopApp.socket) {
            // Se houver criptografia ativa, criptografar dados sensíveis
            if (this.encryption && this.sessionPassword && data.action) {
                try {
                    // Criptografar dados sensíveis (coordenadas, teclas, etc.)
                    const sensitiveData = {
                        x: data.x,
                        y: data.y,
                        key: data.key,
                        code: data.code,
                        button: data.button
                    };
                    
                    const encrypted = await this.encryption.encrypt(
                        sensitiveData, 
                        this.sessionPassword
                    );
                    
                    if (encrypted.success) {
                        // Enviar dados criptografados
                        window.remoteDesktopApp.socket.emit('remote-control', {
                            ...data,
                            encryptedData: encrypted.encryptedData,
                            originalData: null // Remover dados originais
                        });
                        return;
                    }
                } catch (error) {
                    console.error('Erro ao criptografar dados de controle:', error);
                }
            }
            
            // Enviar sem criptografia se falhar
            window.remoteDesktopApp.socket.emit('remote-control', data);
        }
    }
    
    showClickFeedback(x, y) {
        // Criar efeito visual de clique
        const feedback = document.createElement('div');
        feedback.style.cssText = `
            position: absolute;
            width: 20px;
            height: 20px;
            border: 2px solid #ef4444;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
            left: ${x - 10}px;
            top: ${y - 10}px;
            animation: clickFeedback 0.5s ease-out;
        `;
        
        this.canvas.parentElement.style.position = 'relative';
        this.canvas.parentElement.appendChild(feedback);
        
        setTimeout(() => {
            if (feedback.parentNode) {
                feedback.parentNode.removeChild(feedback);
            }
        }, 500);
    }
    
    // Métodos para receber frames remotos (com suporte a criptografia)
    async receiveRemoteFrame(imageData, encrypted = false) {
        if (!this.isActive) return;
        
        let finalImageData = imageData;
        
        // Descriptografar se necessário
        if (encrypted && this.encryption && this.sessionPassword) {
            try {
                const decrypted = await this.encryption.decrypt(
                    imageData, 
                    this.sessionPassword
                );
                
                if (decrypted.success) {
                    finalImageData = decrypted.decryptedData.imageData;
                } else {
                    console.error('Falha ao descriptografar frame');
                    return;
                }
            } catch (error) {
                console.error('Erro ao descriptografar frame:', error);
                return;
            }
        }
        
        // Criar imagem a partir dos dados
        const img = new Image();
        img.onload = () => {
            // Limpar canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Desenhar imagem
            this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
        };
        
        img.src = 'data:image/jpeg;base64,' + finalImageData;
    }
    
    // Ajustar canvas para diferentes resoluções
    setCanvasSize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.maxHeight = '600px';
    }
}

// Adicionar animação CSS para feedback de clique
const style = document.createElement('style');
style.textContent = `
    @keyframes clickFeedback {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(1.5);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Inicializar controle remoto
document.addEventListener('DOMContentLoaded', () => {
    window.remoteControl = new RemoteControl();
});