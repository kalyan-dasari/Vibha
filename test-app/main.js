const fs = require('fs');
const path = require('path');
const { app, BrowserWindow } = require('electron');

const logFile = path.join(__dirname, '..', 'electron-test.log');

app.whenReady().then(() => {
  fs.writeFileSync(logFile, 'App ready\n');
  const win = new BrowserWindow({ show: false, width: 200, height: 200 });
  fs.appendFileSync(logFile, 'typeof win.getMediaSourceId: ' + typeof win.getMediaSourceId + '\n');
  if (typeof win.getMediaSourceId === 'function') {
    fs.appendFileSync(logFile, 'value: ' + win.getMediaSourceId() + '\n');
  }
  win.destroy();
  app.quit();
});
