import { app, BrowserWindow, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Agent } from '@skyscope/agent-core'
import { createProviderManager } from '@skyscope/models'
import { setupOAuthHandlers } from '@skyscope/oauth'
import { setupAutomationHandlers } from '@skyscope/automation'

// Convert __dirname for ES modules
const __dirname = fileURLToPath(new URL('.', import.meta.url))

// Window reference
let mainWindow: BrowserWindow | null = null

async function createWindow() {
  // Create the browser window with modern dark UI
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    backgroundColor: '#0b0b0c',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 12 },
    frame: false,
    roundedCorners: true,
    vibrancy: 'under-window',
    visualEffectState: 'active',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // Security: Restrict navigation and creation of new windows
      webSecurity: true,
      allowRunningInsecureContent: false,
    }
  })

  // Set dark theme
  nativeTheme.themeSource = 'dark'

  // Load the appropriate URL based on environment
  if (import.meta.env.DEV) {
    await mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadURL(`file://${join(__dirname, '../../renderer/index.html')}`)
  }

  // Handle external links to open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}

// App ready event
app.whenReady().then(async () => {
  // Initialize provider manager and agent
  const providers = createProviderManager()
  const agent = new Agent(providers)
  
  // Set up OAuth handlers
  setupOAuthHandlers(ipcMain)
  
  // Set up automation handlers
  setupAutomationHandlers(ipcMain)

  // Set up IPC handlers for agent:chat
  ipcMain.handle('agent:chat', async (_e, payload: { 
    messages: any[]; 
    tabSnapshot?: string; 
    tools?: string[];
    swarmEnabled?: boolean;
  }) => {
    return agent.handleChat(payload)
  })

  // Returns the current application version
  ipcMain.handle('app:version', () => {
    return app.getVersion()
  })

  // Create the main window
  await createWindow()

  // macOS: Re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Handle app quit
app.on('quit', () => {
  // Clean up resources if needed
})

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
})
