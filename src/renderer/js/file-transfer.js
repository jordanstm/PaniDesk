// Transferência de Arquivos com Criptografia
class FileTransfer {
    constructor() {
        this.uploadedFiles = [];
        this.receivedFiles = [];
        this.maxFileSize = 100 * 1024 * 1024; // 100MB
        this.allowedTypes = ['*/*']; // Todos os tipos
        this.encryption = null;
        this.sessionPassword = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadFileHistory();
        this.initializeEncryption();
    }
    
    initializeEncryption() {
        // Aguardar carregamento do módulo de criptografia
        if (window.E2EEncryption) {
            this.encryption = new E2EEncryption();
            
            // Gerar senha de sessão (pode ser trocada durante handshake)
            this.sessionPassword = this.generateSessionPassword();
        }
    }
    
    generateSessionPassword() {
        // Gerar senha segura para a sessão
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    setupEventListeners() {
        // Botões de transferência
        document.getElementById('sendFileBtn').addEventListener('click', () => {
            this.selectAndSendFile();
        });
        
        document.getElementById('receiveFileBtn').addEventListener('click', () => {
            this.receiveFile();
        });
        
        // Configurar área de arrastar e soltar
        this.setupDragAndDrop();
    }
    
    setupDragAndDrop() {
        const fileTransferSection = document.getElementById('file-transfer');
        
        fileTransferSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileTransferSection.classList.add('drag-over');
        });
        
        fileTransferSection.addEventListener('dragleave', (e) => {
            e.preventDefault();
            fileTransferSection.classList.remove('drag-over');
        });
        
        fileTransferSection.addEventListener('drop', (e) => {
            e.preventDefault();
            fileTransferSection.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                this.sendFile(files[0]);
            }
        });
    }
    
    async selectAndSendFile() {
        try {
            const result = await window.electronAPI.showOpenDialog({
                properties: ['openFile'],
                filters: [
                    { name: 'Todos os Arquivos', extensions: ['*'] },
                    { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] },
                    { name: 'Documentos', extensions: ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'] },
                    { name: 'Arquivos de Vídeo', extensions: ['mp4', 'avi', 'mkv', 'mov'] },
                    { name: 'Arquivos de Áudio', extensions: ['mp3', 'wav', 'flac', 'aac'] }
                ]
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                const fileName = filePath.split('/').pop() || filePath.split('\\\\').pop();
                
                // Ler arquivo
                const fs = require('fs');
                const fileData = fs.readFileSync(filePath);
                
                if (fileData.length > this.maxFileSize) {
                    window.remoteDesktopApp.showNotification('Arquivo muito grande. Máximo: 100MB', 'error');
                    return;
                }
                
                await this.sendFileData(fileName, fileData);
            }
        } catch (error) {
            console.error('Erro ao selecionar arquivo:', error);
            window.remoteDesktopApp.showNotification('Erro ao selecionar arquivo', 'error');
        }
    }
    
    async sendFileData(fileName, fileData) {
        try {
            // Mostrar progresso
            this.showTransferProgress(fileName, 'Preparando arquivo...');
            
            let dataToSend = fileData;
            
            // Criptografar arquivo se encryption estiver disponível
            if (this.encryption && this.sessionPassword) {
                this.updateTransferProgress(fileName, 'Criptografando...');
                
                const encryptedResult = await this.encryption.encryptFileStream(
                    fileData, 
                    this.sessionPassword
                );
                
                if (!encryptedResult.success) {
                    throw new Error('Falha na criptografia do arquivo');
                }
                
                // Enviar metadados de criptografia
                window.remoteDesktopApp.socket.emit('file-transfer', {
                    action: 'encryption-metadata',
                    fileName: fileName,
                    encrypted: true,
                    chunkCount: encryptedResult.chunks.length,
                    originalSize: fileData.length
                });
                
                dataToSend = encryptedResult.chunks;
                this.updateTransferProgress(fileName, 'Enviando (criptografado)...');
            } else {
                this.updateTransferProgress(fileName, 'Enviando...');
                // Converter para array de chunks se não criptografado
                const base64Data = fileData.toString('base64');
                const chunkSize = 64 * 1024; // 64KB chunks
                const totalChunks = Math.ceil(base64Data.length / chunkSize);
                dataToSend = [];
                
                for (let i = 0; i < totalChunks; i++) {
                    const chunk = base64Data.slice(i * chunkSize, (i + 1) * chunkSize);
                    dataToSend.push(chunk);
                }
            }
            
            // Enviar chunks
            const totalChunks = dataToSend.length;
            for (let i = 0; i < totalChunks; i++) {
                const chunk = dataToSend[i];
                
                window.remoteDesktopApp.socket.emit('file-transfer', {
                    action: 'send-chunk',
                    fileName: fileName,
                    chunk: chunk,
                    chunkIndex: i,
                    totalChunks: totalChunks,
                    fileSize: fileData.length,
                    encrypted: this.encryption && this.sessionPassword
                });
                
                // Atualizar progresso
                const progress = ((i + 1) / totalChunks) * 100;
                this.updateTransferProgress(fileName, progress);
                
                // Pequena pausa para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Finalizar transferência
            window.remoteDesktopApp.socket.emit('file-transfer', {
                action: 'send-complete',
                fileName: fileName,
                fileSize: fileData.length,
                encrypted: this.encryption && this.sessionPassword
            });
            
            // Adicionar à lista de arquivos enviados
            const fileInfo = {
                name: fileName,
                size: this.formatFileSize(fileData.length),
                timestamp: new Date(),
                status: 'Enviado' + (this.encryption && this.sessionPassword ? ' (Criptografado)' : ''),
                encrypted: this.encryption && this.sessionPassword
            };
            
            this.uploadedFiles.push(fileInfo);
            this.updateUploadedFilesList();
            
            this.hideTransferProgress(fileName);
            window.remoteDesktopApp.showNotification(
                `Arquivo ${fileName} enviado com sucesso${this.encryption && this.sessionPassword ? ' (criptografado)' : ''}`, 
                'success'
            );
        } catch (error) {
            console.error('Erro ao enviar arquivo:', error);
            this.hideTransferProgress(fileName);
            window.remoteDesktopApp.showNotification('Erro ao enviar arquivo', 'error');
        }
    }
    
    receiveFile() {
        // Solicitar lista de arquivos disponíveis
        if (window.remoteDesktopApp && window.remoteDesktopApp.socket) {
            window.remoteDesktopApp.socket.emit('file-transfer', {
                action: 'list-files'
            });
            
            window.remoteDesktopApp.showNotification('Solicitando lista de arquivos...', 'info');
        }
    }
    
    async downloadFile(fileInfo) {
        try {
            // Solicitar arquivo
            if (window.remoteDesktopApp && window.remoteDesktopApp.socket) {
                window.remoteDesktopApp.socket.emit('file-transfer', {
                    action: 'request-file',
                    fileName: fileInfo.name
                });
                
                this.showTransferProgress(fileInfo.name, 'Recebendo...');
            }
        } catch (error) {
            console.error('Erro ao solicitar arquivo:', error);
            window.remoteDesktopApp.showNotification('Erro ao solicitar arquivo', 'error');
        }
    }
    
    // Receber chunk de arquivo
    receiveFileChunk(data) {
        const { fileName, chunk, chunkIndex, totalChunks, encrypted } = data;
        
        // Armazenar chunk (em produção, usar um sistema mais robusto)
        if (!window.receivingFile) {
            window.receivingFile = {
                name: fileName,
                chunks: new Array(totalChunks),
                receivedChunks: 0,
                totalChunks: totalChunks,
                encrypted: encrypted || false
            };
        }
        
        window.receivingFile.chunks[chunkIndex] = chunk;
        window.receivingFile.receivedChunks++;
        
        // Atualizar progresso
        const progress = (window.receivingFile.receivedChunks / totalChunks) * 100;
        const statusText = encrypted ? 'Recebendo (criptografado)...' : 'Recebendo...';
        this.updateTransferProgress(fileName, progress, statusText);
        
        // Verificar se completou
        if (window.receivingFile.receivedChunks === totalChunks) {
            this.completeFileReceive();
        }
    }
    
    async completeFileReceive() {
        try {
            const { name, chunks, encrypted } = window.receivingFile;
            let finalData;
            
            if (encrypted && this.encryption && this.sessionPassword) {
                this.updateTransferProgress(name, 100, 'Descriptografando...');
                
                // Descriptografar arquivo
                const decryptedResult = await this.encryption.decryptFileStream(
                    chunks,
                    this.sessionPassword
                );
                
                if (!decryptedResult.success) {
                    throw new Error('Falha na descriptografia do arquivo');
                }
                
                finalData = decryptedResult.data;
                window.remoteDesktopApp.showNotification('Arquivo descriptografado com sucesso', 'success');
            } else {
                // Juntar chunks se não criptografado
                const base64Data = chunks.join('');
                finalData = Buffer.from(base64Data, 'base64');
            }
            
            // Solicitar local para salvar
            const result = await window.electronAPI.showSaveDialog({
                defaultPath: name,
                filters: [
                    { name: 'Todos os Arquivos', extensions: ['*'] }
                ]
            });
            
            if (!result.canceled) {
                // Salvar arquivo
                const fs = require('fs');
                fs.writeFileSync(result.filePath, finalData);
                
                // Adicionar à lista
                const fileInfo = {
                    name: name,
                    size: this.formatFileSize(finalData.length),
                    timestamp: new Date(),
                    status: 'Recebido' + (encrypted ? ' (Descriptografado)' : ''),
                    path: result.filePath,
                    encrypted: encrypted
                };
                
                this.receivedFiles.push(fileInfo);
                this.updateReceivedFilesList();
                
                this.hideTransferProgress(name);
                window.remoteDesktopApp.showNotification(
                    `Arquivo ${name} recebido com sucesso${encrypted ? ' (descriptografado)' : ''}`, 
                    'success'
                );
            }
            
            // Limpar
            delete window.receivingFile;
            
        } catch (error) {
            console.error('Erro ao completar recebimento:', error);
            this.hideTransferProgress(window.receivingFile?.name || 'arquivo');
            window.remoteDesktopApp.showNotification('Erro ao receber arquivo', 'error');
        }
    }
    
    showTransferProgress(fileName, status) {
        // Criar ou atualizar barra de progresso
        let progressItem = document.getElementById(`progress-${fileName}`);
        
        if (!progressItem) {
            progressItem = document.createElement('div');
            progressItem.id = `progress-${fileName}`;
            progressItem.className = 'transfer-progress';
            progressItem.innerHTML = `
                <div class="progress-info">
                    <span class="file-name">${fileName}</span>
                    <span class="progress-status">${status}</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            `;
            
            // Adicionar estilos
            Object.assign(progressItem.style, {
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                background: 'white',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                zIndex: '1000',
                minWidth: '300px'
            });
            
            document.body.appendChild(progressItem);
        } else {
            progressItem.querySelector('.progress-status').textContent = status;
        }
    }
    
    updateTransferProgress(fileName, progress, customStatus = null) {
        const progressItem = document.getElementById(`progress-${fileName}`);
        if (progressItem) {
            const progressFill = progressItem.querySelector('.progress-fill');
            const progressStatus = progressItem.querySelector('.progress-status');
            
            progressFill.style.width = `${progress}%`;
            
            if (customStatus) {
                progressStatus.textContent = customStatus;
            } else {
                progressStatus.textContent = `${Math.round(progress)}%`;
            }
        }
    }
    
    hideTransferProgress(fileName) {
        const progressItem = document.getElementById(`progress-${fileName}`);
        if (progressItem && progressItem.parentNode) {
            progressItem.parentNode.removeChild(progressItem);
        }
    }
    
    updateUploadedFilesList() {
        const container = document.getElementById('sentFiles');
        
        if (this.uploadedFiles.length === 0) {
            container.innerHTML = `
                <div class="no-files">
                    <i class="fas fa-file-upload"></i>
                    <p>Nenhum arquivo enviado</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        this.uploadedFiles.forEach(file => {
            const fileItem = this.createFileItem(file, 'sent');
            container.appendChild(fileItem);
        });
    }
    
    updateReceivedFilesList() {
        const container = document.getElementById('receivedFiles');
        
        if (this.receivedFiles.length === 0) {
            container.innerHTML = `
                <div class="no-files">
                    <i class="fas fa-file-download"></i>
                    <p>Nenhum arquivo recebido</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = '';
        this.receivedFiles.forEach(file => {
            const fileItem = this.createFileItem(file, 'received');
            container.appendChild(fileItem);
        });
    }
    
    createFileItem(file, type) {
        const item = document.createElement('div');
        item.className = 'file-item';
        
        const iconClass = this.getFileIcon(file.name);
        const timeAgo = this.getTimeAgo(file.timestamp);
        
        item.innerHTML = `
            <div class="file-info">
                <i class="file-icon ${iconClass}"></i>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <small>${file.size} • ${timeAgo}</small>
                </div>
            </div>
            <div class="file-actions">
                ${type === 'received' && file.path ? `
                    <button class="btn-icon" title="Abrir arquivo" onclick="window.fileTransfer.openFile('${file.path}')">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                ` : ''}
                <button class="btn-icon" title="Reenviar" onclick="window.fileTransfer.resendFile('${file.name}')">
                    <i class="fas fa-redo"></i>
                </button>
            </div>
        `;
        
        return item;
    }
    
    getFileIcon(fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        const iconMap = {
            'pdf': 'fas fa-file-pdf',
            'doc': 'fas fa-file-word',
            'docx': 'fas fa-file-word',
            'xls': 'fas fa-file-excel',
            'xlsx': 'fas fa-file-excel',
            'ppt': 'fas fa-file-powerpoint',
            'pptx': 'fas fa-file-powerpoint',
            'txt': 'fas fa-file-alt',
            'jpg': 'fas fa-file-image',
            'jpeg': 'fas fa-file-image',
            'png': 'fas fa-file-image',
            'gif': 'fas fa-file-image',
            'mp4': 'fas fa-file-video',
            'avi': 'fas fa-file-video',
            'mp3': 'fas fa-file-audio',
            'wav': 'fas fa-file-audio',
            'zip': 'fas fa-file-archive',
            'rar': 'fas fa-file-archive'
        };
        
        return iconMap[ext] || 'fas fa-file';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getTimeAgo(timestamp) {
        const now = new Date();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (days > 0) return `${days}d atrás`;
        if (hours > 0) return `${hours}h atrás`;
        if (minutes > 0) return `${minutes}m atrás`;
        return 'Agora';
    }
    
    openFile(filePath) {
        try {
            const { shell } = require('electron');
            shell.showItemInFolder(filePath);
        } catch (error) {
            console.error('Erro ao abrir arquivo:', error);
            window.remoteDesktopApp.showNotification('Erro ao abrir arquivo', 'error');
        }
    }
    
    resendFile(fileName) {
        // Procurar arquivo na lista de enviados
        const file = this.uploadedFiles.find(f => f.name === fileName);
        if (file) {
            // Reenviar (simplificado - em produção, manter referência ao arquivo original)
            window.remoteDesktopApp.showNotification(`Reenviando ${fileName}...`, 'info');
        }
    }
    
    loadFileHistory() {
        // Carregar histórico do localStorage
        const savedUploads = localStorage.getItem('uploadedFiles');
        const savedReceived = localStorage.getItem('receivedFiles');
        
        if (savedUploads) {
            this.uploadedFiles = JSON.parse(savedUploads);
            this.updateUploadedFilesList();
        }
        
        if (savedReceived) {
            this.receivedFiles = JSON.parse(savedReceived);
            this.updateReceivedFilesList();
        }
    }
    
    saveFileHistory() {
        localStorage.setItem('uploadedFiles', JSON.stringify(this.uploadedFiles));
        localStorage.setItem('receivedFiles', JSON.stringify(this.receivedFiles));
    }
    
    // Configurar listeners do socket
    setupSocketListeners() {
        if (window.remoteDesktopApp && window.remoteDesktopApp.socket) {
            const socket = window.remoteDesktopApp.socket;
            
            socket.on('file-transfer-response', (data) => {
                this.handleFileTransferResponse(data);
            });
            
            socket.on('file-transfer-chunk', (data) => {
                this.receiveFileChunk(data);
            });
            
            socket.on('file-transfer-complete', (data) => {
                this.completeFileReceive();
            });
            
            socket.on('file-list', (data) => {
                this.showAvailableFiles(data.files);
            });
        }
    }
    
    handleFileTransferResponse(data) {
        if (data.accepted) {
            window.remoteDesktopApp.showNotification('Transferência aceita', 'success');
        } else {
            window.remoteDesktopApp.showNotification('Transferência recusada', 'error');
        }
    }
    
    showAvailableFiles(files) {
        if (files.length === 0) {
            window.remoteDesktopApp.showNotification('Nenhum arquivo disponível', 'info');
            return;
        }
        
        // Criar modal para selecionar arquivo
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Arquivos Disponíveis</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="files-list">
                        ${files.map(file => `
                            <div class="file-item">
                                <div class="file-info">
                                    <i class="file-icon ${this.getFileIcon(file.name)}"></i>
                                    <div class="file-details">
                                        <h4>${file.name}</h4>
                                        <small>${this.formatFileSize(file.size)}</small>
                                    </div>
                                </div>
                                <button class="btn btn-primary" onclick="window.fileTransfer.downloadFile({name: '${file.name}', size: ${file.size}})">
                                    <i class="fas fa-download"></i>
                                    Baixar
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
}

// Adicionar estilos CSS para transferência
const style = document.createElement('style');
style.textContent = `
    .transfer-progress {
        min-width: 300px;
    }
    
    .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
        font-size: 0.