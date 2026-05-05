const { app, BrowserWindow } = require('electron');
const path = require('path');
const { fork } = require('child_process');
require('dotenv').config();

let serverProcess;

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // Start custom Next.js server in production
        // We use fork to run it as a separate node process
        const serverPath = path.join(__dirname, 'server.js');
        serverProcess = fork(serverPath, [], {
            env: { ...process.env, NODE_ENV: 'production' }
        });

        // Wait for the server to be ready
        // In a real app we might want to poll or wait for a message
        // serverProcess.on('message', (msg) => { if (msg === 'ready') ... })
        // For simplicity, we just wait a bit or let loadURL retry

        setTimeout(() => {
            mainWindow.loadURL('http://localhost:3000');
        }, 1000);
    }
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (serverProcess) serverProcess.kill();
    if (process.platform !== 'darwin') app.quit();
});
