const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const os = require('os');

let mainWindow;
let isDev = process.argv.includes('--dev');

// Configurações da janela
const WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  minWidth: 800,
  minHeight: 600,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    enableRemoteModule: false,
    preload: path.join(__dirname, 'preload.js')
  },
  icon: path.join(__dirname, '../assets/icon.png'),
  show: false
};

// Criar janela principal
function createMainWindow() {
  mainWindow = new BrowserWindow(WINDOW_CONFIG);
  
  // Carregar arquivo HTML
  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  
  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });
  
  // Eventos da janela
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  
  // Prevenir abrir links externos na mesma janela
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Criar menu da aplicação
function createApplicationMenu() {
  const template = [
    {
      label: 'Aplicativo',
      submenu: [
        {
          label: 'Sobre',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Sobre',
              message: 'Remote Desktop App',
              detail: 'Aplicativo de desktop remoto similar ao AnyDesk\n\nVersão 1.0.0'
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];
  
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Handlers IPC
ipcMain.handle('get-system-info', () => {
  return {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    username: os.userInfo().username,
    homedir: os.homedir()
  };
});

ipcMain.handle('show-message-box', (event, options) => {
  return dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('show-open-dialog', (event, options) => {
  return dialog.showOpenDialog(mainWindow, options);
});

ipcMain.handle('show-save-dialog', (event, options) => {
  return dialog.showSaveDialog(mainWindow, options);
});

ipcMain.handle('get-client-id', () => {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
});

ipcMain.handle('create-new-window', (event, url) => {
  const newWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  
  newWindow.loadURL(url);
  return newWindow.id;
});

// Eventos do aplicativo
app.whenReady().then(() => {
  createMainWindow();
  createApplicationMenu();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Segurança
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// Configurações do PANIDESK
if (process.platform === 'darwin') {
  app.setAboutPanelOptions({
    applicationName: 'PANIDESK',
    applicationVersion: app.getVersion(),
    copyright: '© 2024 PANIDESK Team - Conecta quem tá PANO pra distância! 💻⚡',
    credits: 'Feito com 💖 e Electron.js por desenvolvedores que são PANO pra codar!',
    website: 'https://panidesk.com'
  });
}