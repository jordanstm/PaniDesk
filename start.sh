#!/bin/bash

# Script de inicialização do Remote Desktop App

echo "🚀 Iniciando PANIDESK..."
echo "==========================="
echo "💻 O Desktop Remoto que é PANO pra MAMÃO! ⚡"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Node.js
echo -n "📦 Verificando Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
else
    echo -e "${RED}✗ Node.js não encontrado${NC}"
    echo "Por favor, instale o Node.js 16 ou superior: https://nodejs.org/"
    exit 1
fi

# Verificar npm
echo -n "📦 Verificando npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm $NPM_VERSION${NC}"
else
    echo -e "${RED}✗ npm não encontrado${NC}"
    exit 1
fi

# Verificar dependências principais
echo -n "📂 Verificando dependências do projeto... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Dependências instaladas${NC}"
else
    echo -e "${YELLOW}⚠ Dependências não encontradas${NC}"
    echo "Instalando dependências principais..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Erro ao instalar dependências principais${NC}"
        exit 1
    fi
fi

# Verificar dependências do servidor
echo -n "📂 Verificando dependências do servidor... "
if [ -d "server/node_modules" ]; then
    echo -e "${GREEN}✓ Dependências do servidor instaladas${NC}"
else
    echo -e "${YELLOW}⚠ Dependências do servidor não encontradas${NC}"
    echo "Instalando dependências do servidor..."
    cd server
    npm install
    cd ..
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Erro ao instalar dependências do servidor${NC}"
        exit 1
    fi
fi

# Criar diretório de uploads
echo -n "📁 Verificando diretório de uploads... "
if [ ! -d "server/uploads" ]; then
    mkdir -p server/uploads
    echo -e "${GREEN}✓ Diretório criado${NC}"
else
    echo -e "${GREEN}✓ Diretório existe${NC}"
fi

# Verificar arquivo de ambiente
echo -n "⚙️  Verificando arquivo de configuração... "
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}⚠ Arquivo .env criado a partir do exemplo${NC}"
        echo "Por favor, edite o arquivo .env com suas configurações"
    else
        echo -e "${RED}✗ Arquivo .env.example não encontrado${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Arquivo de configuração existe${NC}"
fi

echo ""
echo -e "${GREEN}✅ Tudo pronto!${NC}"
echo ""
echo "🎯 Opções de execução:"
echo "1. ${YELLOW}Desenvolvimento${NC} - Servidor + Aplicação"
echo "2. ${YELLOW}Servidor apenas${NC} - Apenas servidor de sinalização"
echo "3. ${YELLOW}Aplicação apenas${NC} - Apenas interface (servidor deve estar rodando)"
echo "4. ${YELLOW}Build${NC} - Criar executável"
echo "5. ${YELLOW}Sair${NC}"
echo ""

# Função para matar processos filhos ao sair
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Encerrando processos...${NC}"
    pkill -P $$
    exit 0
}

# Trap para capturar sinal de saída
trap cleanup SIGINT SIGTERM

while true; do
    echo -n "Escolha uma opção (1-5): "
    read choice
    
    case $choice in
        1)
            echo -e "${GREEN}🚀 Iniciando em modo desenvolvimento...${NC}"
            echo -e "${YELLOW}📡 Servidor de sinalização${NC}"
            cd server
            npm start &
            SERVER_PID=$!
            cd ..
            
            sleep 3
            
            echo -e "${YELLOW}💻 Aplicação Electron${NC}"
            npm run dev
            
            wait $SERVER_PID
            break
            ;;
        2)
            echo -e "${GREEN}📡 Iniciando apenas servidor...${NC}"
            cd server
            npm start
            break
            ;;
        3)
            echo -e "${GREEN}💻 Iniciando apenas aplicação...${NC}"
            echo -e "${YELLOW}⚠️  Certifique-se de que o servidor está rodando${NC}"
            npm run dev
            break
            ;;
        4)
            echo -e "${GREEN}🔨 Criando build...${NC}"
            echo "Selecione a plataforma:"
            echo "1. Windows"
            echo "2. macOS"
            echo "3. Linux"
            echo -n "Escolha (1-3): "
            read platform
            
            case $platform in
                1)
                    npm run build:win
                    ;;
                2)
                    npm run build:mac
                    ;;
                3)
                    npm run build:linux
                    ;;
                *)
                    echo -e "${RED}❌ Opção inválida${NC}"
                    ;;
            esac
            break
            ;;
        5)
            echo -e "${GREEN}👋 Até mais!${NC}"
            break
            ;;
        *)
            echo -e "${RED}❌ Opção inválida. Tente novamente.${NC}"
            ;;
    esac
done

cleanup