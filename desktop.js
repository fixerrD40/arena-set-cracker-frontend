const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true, // Gives Angular direct access to Node.js features
      contextIsolation: false
    }
  });

  win.webContents.openDevTools();

  // Load the compiled Angular index.html file
  win.loadFile(path.join(__dirname, 'dist/arena-set-cracker/browser/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
