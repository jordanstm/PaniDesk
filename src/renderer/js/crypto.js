// Sistema de Criptografia End-to-End
class E2EEncryption {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
        this.ivLength = 12; // 96 bits para AES-GCM
        this.saltLength = 32;
        this.iterations = 100000;
        this.keyCache = new Map();
        this.sessionKeys = new Map();
    }

    // Gerar chave mestra a partir de senha
    async generateMasterKey(password, salt) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        const importedPassword = await crypto.subtle.importKey(
            'raw',
            passwordBuffer,
            'PBKDF2',
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: this.iterations,
                hash: 'SHA-256'
            },
            importedPassword,
            {
                name: this.algorithm,
                length: this.keyLength
            },
            false,
            ['encrypt', 'decrypt']
        );
    }

    // Gerar salt aleatório
    generateSalt() {
        return crypto.getRandomValues(new Uint8Array(this.saltLength));
    }

    // Gerar IV aleatório
    generateIV() {
        return crypto.getRandomValues(new Uint8Array(this.ivLength));
    }

    // Criptografar dados
    async encrypt(data, password) {
        try {
            const salt = this.generateSalt();
            const iv = this.generateIV();
            const key = await this.generateMasterKey(password, salt);

            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                dataBuffer
            );

            // Combina salt + iv + dados criptografados
            const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
            result.set(salt, 0);
            result.set(iv, salt.length);
            result.set(new Uint8Array(encryptedData), salt.length + iv.length);

            return {
                success: true,
                encryptedData: Array.from(result),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao criptografar dados:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Descriptografar dados
    async decrypt(encryptedArray, password) {
        try {
            const encryptedData = new Uint8Array(encryptedArray);
            
            // Extrai salt, iv e dados
            const salt = encryptedData.slice(0, this.saltLength);
            const iv = encryptedData.slice(this.saltLength, this.saltLength + this.ivLength);
            const data = encryptedData.slice(this.saltLength + this.ivLength);

            const key = await this.generateMasterKey(password, salt);

            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: this.algorithm,
                    iv: iv
                },
                key,
                data
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            
            return {
                success: true,
                decryptedData: JSON.parse(jsonString)
            };
        } catch (error) {
            console.error('Erro ao descriptografar dados:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Gerar par de chaves RSA para troca de chaves segura
    async generateRSAKeyPair() {
        return crypto.subtle.generateKey(
            {
                name: 'RSA-OAEP',
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: 'SHA-256'
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Exportar chave pública para troca
    async exportPublicKey(publicKey) {
        const exported = await crypto.subtle.exportKey('spki', publicKey);
        return Array.from(new Uint8Array(exported));
    }

    // Importar chave pública recebida
    async importPublicKey(publicKeyArray) {
        const publicKeyBuffer = new Uint8Array(publicKeyArray);
        return crypto.subtle.importKey(
            'spki',
            publicKeyBuffer,
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        );
    }

    // Criptografar chave de sessão com RSA
    async encryptSessionKey(sessionKey, publicKey) {
        const exportedSessionKey = await crypto.subtle.exportKey('raw', sessionKey);
        const encrypted = await crypto.subtle.encrypt(
            {
                name: 'RSA-OAEP'
            },
            publicKey,
            exportedSessionKey
        );
        return Array.from(new Uint8Array(encrypted));
    }

    // Descriptografar chave de sessão com RSA
    async decryptSessionKey(encryptedSessionKey, privateKey) {
        const decrypted = await crypto.subtle.decrypt(
            {
                name: 'RSA-OAEP'
            },
            privateKey,
            new Uint8Array(encryptedSessionKey)
        );
        return crypto.subtle.importKey(
            'raw',
            decrypted,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Gerar chave de sessão para comunicação rápida
    async generateSessionKey() {
        return crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    // Criptografar com chave de sessão (mais rápido)
    async encryptWithSessionKey(data, sessionKey) {
        try {
            const iv = this.generateIV();
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));

            const encryptedData = await crypto.subtle.encrypt(
                {
                    name: 'AES-GCM',
                    iv: iv
                },
                sessionKey,
                dataBuffer
            );

            return {
                success: true,
                encryptedData: Array.from(new Uint8Array(encryptedData)),
                iv: Array.from(iv),
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erro ao criptografar com chave de sessão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Descriptografar com chave de sessão
    async decryptWithSessionKey(encryptedData, iv, sessionKey) {
        try {
            const decryptedData = await crypto.subtle.decrypt(
                {
                    name: 'AES-GCM',
                    iv: new Uint8Array(iv)
                },
                sessionKey,
                new Uint8Array(encryptedData)
            );

            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedData);
            
            return {
                success: true,
                decryptedData: JSON.parse(jsonString)
            };
        } catch (error) {
            console.error('Erro ao descriptografar com chave de sessão:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Armazenar chave de sessão para conexão
    storeSessionKey(connectionId, sessionKey) {
        this.sessionKeys.set(connectionId, sessionKey);
    }

    // Recuperar chave de sessão
    getSessionKey(connectionId) {
        return this.sessionKeys.get(connectionId);
    }

    // Limpar chave de sessão
    clearSessionKey(connectionId) {
        this.sessionKeys.delete(connectionId);
    }

    // Verificar integridade dos dados
    async verifyIntegrity(data, signature, publicKey) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            const isValid = await crypto.subtle.verify(
                {
                    name: 'RSA-PSS',
                    saltLength: 32
                },
                publicKey,
                new Uint8Array(signature),
                dataBuffer
            );
            
            return isValid;
        } catch (error) {
            console.error('Erro ao verificar integridade:', error);
            return false;
        }
    }

    // Assinar dados para verificação de integridade
    async signData(data, privateKey) {
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            const signature = await crypto.subtle.sign(
                {
                    name: 'RSA-PSS',
                    saltLength: 32
                },
                privateKey,
                dataBuffer
            );
            
            return Array.from(new Uint8Array(signature));
        } catch (error) {
            console.error('Erro ao assinar dados:', error);
            return null;
        }
    }

    // Hash de senha para armazenamento seguro
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Gerar hash de arquivo para verificação
    async hashFile(fileBuffer) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // Criptografar arquivo grande (streaming)
    async encryptFileStream(fileBuffer, password) {
        try {
            const chunkSize = 1024 * 1024; // 1MB chunks
            const chunks = [];
            
            for (let i = 0; i < fileBuffer.byteLength; i += chunkSize) {
                const chunk = fileBuffer.slice(i, i + chunkSize);
                const encryptedChunk = await this.encrypt(
                    { data: Array.from(new Uint8Array(chunk)) },
                    password
                );
                
                if (!encryptedChunk.success) {
                    throw new Error('Falha ao criptografar chunk');
                }
                
                chunks.push(encryptedChunk.encryptedData);
            }
            
            return {
                success: true,
                chunks: chunks,
                originalSize: fileBuffer.byteLength
            };
        } catch (error) {
            console.error('Erro ao criptografar arquivo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Descriptografar arquivo grande (streaming)
    async decryptFileStream(encryptedChunks, password) {
        try {
            const chunks = [];
            
            for (const encryptedChunk of encryptedChunks) {
                const decryptedChunk = await this.decrypt(encryptedChunk, password);
                
                if (!decryptedChunk.success) {
                    throw new Error('Falha ao descriptografar chunk');
                }
                
                chunks.push(new Uint8Array(decryptedChunk.decryptedData.data));
            }
            
            // Combina todos os chunks
            const totalSize = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
            const result = new Uint8Array(totalSize);
            let offset = 0;
            
            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }
            
            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('Erro ao descriptografar arquivo:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Exportar para uso global
window.E2EEncryption = E2EEncryption;