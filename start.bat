@echo off
REM Script de inicialização do PANIDESK para Windows

echo 🚀 Iniciando PANIDESK...
echo ===========================
echo 💻 O Desktop Remoto que é PANO pra MAMão! ⚡

REM Verificar Node.js
echo 📦 Verificando Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado
    echo Por favor, instale o Node.js 16 ou superior: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js encontrado
)

REM Verificar npm
echo 📦 Verificando npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm não encontrado
    pause
    exit /b 1
) else (
    echo ✅ npm encontrado
)

REM Verificar dependências principais
echo 📂 Verificando dependências do projeto...
if exist node_modules (
    echo ✅ Dependências instaladas
) else (
    echo ⚠️  Dependências não encontradas
    echo Instalando dependências principais...
    call npm install
    if errorlevel 1 (
        echo ❌ Erro ao instalar dependências principais
        pause
        exit /b 1
    )
)

REM Verificar dependências do servidor
echo 📂 Verificando dependências do servidor...
if exist server\node_modules (
    echo ✅ Dependências do servidor instaladas
) else (
    echo ⚠️  Dependências do servidor não encontradas
    echo Instalando dependências do servidor...
    cd server
    call npm install
    cd ..
    if errorlevel 1 (
        echo ❌ Erro ao instalar dependências do servidor
        pause
        exit /b 1
    )
)

REM Criar diretório de uploads
echo 📁 Verificando diretório de uploads...
if not exist server\uploads (
    mkdir server\uploads
    echo ✅ Diretório criado
) else (
    echo ✅ Diretório existe
)

REM Verificar arquivo de ambiente
echo ⚙️  Verificando arquivo de configuração...
if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo ⚠️  Arquivo .env criado a partir do exemplo
        echo Por favor, edite o arquivo .env com suas configurações
    ) else (
        echo ❌ Arquivo .env.example não encontrado
        pause
        exit /b 1
    )
) else (
    echo ✅ Arquivo de configuração existe
)

echo.
echo ✅ Tudo pronto!
echo.
echo 🎯 Opções de execução:
echo 1. Desenvolvimento - Servidor + Aplicação
echo 2. Servidor apenas - Apenas servidor de sinalização
echo 3. Aplicação apenas - Apenas interface (servidor deve estar rodando)
echo 4. Build - Criar executável
echo 5. Sair
echo.

:menu
set /p choice=Escolha uma opção (1-5): 

if "%choice%"=="1" (
    echo 🚀 Iniciando em modo desenvolvimento...
    echo 📡 Servidor de sinalização
    start cmd /k "cd server && npm start"
    
    timeout /t 3 /nobreak >nul
    
    echo 💻 Aplicação Electron
    call npm run dev
    goto :end
)

if "%choice%"=="2" (
    echo 📡 Iniciando apenas servidor...
    cd server
    call npm start
    goto :end
)

if "%choice%"=="3" (
    echo 💻 Iniciando apenas aplicação...
    echo ⚠️  Certifique-se de que o servidor está rodando
    call npm run dev
    goto :end
)

if "%choice%"=="4" (
    echo 🔨 Criando build...
    echo Selecione a plataforma:
    echo 1. Windows
    echo 2. macOS
    echo 3. Linux
    set /p platform=Escolha (1-3): 
    
    if "%platform%"=="1" (
        call npm run build:win
    ) else if "%platform%"=="2" (
        call npm run build:mac
    ) else if "%platform%"=="3" (
        call npm run build:linux
    ) else (
        echo ❌ Opção inválida
    )
    goto :end
)

if "%choice%"=="5" (
    echo 👋 Até mais!
    goto :end
)

echo ❌ Opção inválida. Tente novamente.
goto :menu

:end
pause