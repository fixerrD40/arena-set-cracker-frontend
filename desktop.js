const { app, BrowserWindow, session } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

function createWindow() {
  // Keep Chromium's Electron token in the UA; append a Scryfall-identifiable suffix.
  // Replacing the UA entirely made navigator.userAgent miss "electron" and routed desktop to /login.
  const scryfallTag = 'MtgVaultApp/1.0.0 (stafford.hank@gmail.com)';
  const sessionUA = session.defaultSession.getUserAgent();
  if (!sessionUA.includes('MtgVaultApp')) {
    session.defaultSession.setUserAgent(`${sessionUA} ${scryfallTag}`);
  }

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  win.webContents.openDevTools();
  win.loadFile(path.join(__dirname, 'dist/arena-set-cracker/browser/index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
