const fs = require('fs');
const electron = require('electron');
const logFile = 'K:\\Big Things\floating-ai\\electron-test.log';
fs.writeFileSync(logFile, 'process.type in app: ' + process.type + '\n');
fs.writeFileSync(logFile, 'typeof electron in app: ' + typeof electron + '\n', { flag: 'a' });
fs.writeFileSync(logFile, 'keys of electron: ' + Object.keys(electron).join(', ') + '\n', { flag: 'a' });
if (electron.app) {
  electron.app.quit();
}
