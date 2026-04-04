import { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, ipcMain, Notification } from 'electron';
import * as path from 'path';

/**
 * Ouro Desktop — Global Signal Capture
 * 
 * The desktop app provides:
 * 1. Global hotkey (Cmd+Shift+O / Ctrl+Shift+O) — instant signal input
 * 2. System tray presence — always available
 * 3. Clipboard monitoring — auto-capture copied content as signal
 * 4. Screenshot capture — visual signals from any app
 * 5. Native notifications — artifact delivery without browser
 * 
 * Constitutional Principle #1: Zero Friction
 * The desktop app eliminates the need to open a browser.
 * Any thought → global hotkey → signal captured in <1 second.
 */

const API_URL = process.env.OURO_API_URL || 'http://localhost:3001';
const WEB_URL = process.env.OURO_WEB_URL || 'http://localhost:3000';

let mainWindow: BrowserWindow | null = null;
let quickInputWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ===== Main Window =====
function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Ouro',
    backgroundColor: '#0c0c0f',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL(WEB_URL);

  mainWindow.on('close', (event) => {
    // Don't close, minimize to tray
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== Quick Input Window (Global Hotkey) =====
function createQuickInputWindow(): void {
  if (quickInputWindow) {
    quickInputWindow.show();
    quickInputWindow.focus();
    return;
  }

  quickInputWindow = new BrowserWindow({
    width: 600,
    height: 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  quickInputWindow.loadFile(path.join(__dirname, 'quick-input.html'));

  // Center on screen
  const { screen } = require('electron');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  quickInputWindow.setPosition(
    Math.floor((width - 600) / 2),
    Math.floor(height * 0.3),
  );

  quickInputWindow.once('ready-to-show', () => {
    quickInputWindow?.show();
    quickInputWindow?.focus();
  });

  quickInputWindow.on('blur', () => {
    quickInputWindow?.hide();
  });

  quickInputWindow.on('closed', () => {
    quickInputWindow = null;
  });
}

// ===== System Tray =====
function createTray(): void {
  // Use a simple text-based icon (in production, use a real icon file)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setTitle('🐍');
  tray.setToolTip('Ouro — The Self-Evolving Signal System');

  const contextMenu = Menu.buildFromTemplate([
    { label: '🐍 Ouro', type: 'normal', enabled: false },
    { type: 'separator' },
    {
      label: 'Quick Signal (⌘⇧O)',
      click: () => createQuickInputWindow(),
      accelerator: 'CommandOrControl+Shift+O',
    },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Signals History',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${WEB_URL}/history`);
        }
      },
    },
    {
      label: 'Evolution Stats',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${WEB_URL}/evolution`);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.loadURL(`${WEB_URL}/settings`);
        }
      },
    },
    { type: 'separator' },
    { label: 'Quit Ouro', click: () => { app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    } else {
      createMainWindow();
    }
  });
}

// ===== IPC Handlers =====
function setupIPC(): void {
  // Quick signal submission
  ipcMain.handle('submit-signal', async (event, text: string) => {
    try {
      const response = await fetch(`${API_URL}/api/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();

      // Show notification with result
      if (data.artifacts?.length > 0) {
        new Notification({
          title: '🐍 Ouro',
          body: `${data.intent?.type}: ${data.intent?.description?.slice(0, 80)}`,
        }).show();
      }

      return data;
    } catch (error: any) {
      return { error: error.message };
    }
  });

  // Get system status
  ipcMain.handle('get-status', async () => {
    try {
      const r = await fetch(`${API_URL}/api/health`);
      return r.json();
    } catch {
      return { status: 'offline' };
    }
  });

  // Clipboard capture
  ipcMain.handle('capture-clipboard', async () => {
    const { clipboard } = require('electron');
    const text = clipboard.readText();
    if (text) {
      const response = await fetch(`${API_URL}/api/signals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[Clipboard capture] ${text}`,
          context: { device: 'desktop', source: 'clipboard' },
        }),
      });
      return response.json();
    }
    return null;
  });
}

// ===== App Lifecycle =====
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  setupIPC();

  // Register global hotkey
  const registered = globalShortcut.register('CommandOrControl+Shift+O', () => {
    createQuickInputWindow();
  });

  if (!registered) {
    console.warn('[Desktop] Failed to register global shortcut');
  }

  console.log('🐍 Ouro Desktop started');
  console.log(`   API: ${API_URL}`);
  console.log(`   Web: ${WEB_URL}`);
  console.log('   Hotkey: Cmd+Shift+O (Quick Signal)');
});

app.on('window-all-closed', () => {
  // Don't quit on macOS — stay in tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
