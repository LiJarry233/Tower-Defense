const { app, BrowserWindow } = require("electron");
const path = require("path");

// Start Vite dev server for dev mode
const isDev = process.argv.includes("--dev");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: false,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
    win.setFullScreen(true);
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
