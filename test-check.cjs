const fs = require('fs');
const logFile = 'K:\\Big Things\\floating-ai\\electron-test.log';
fs.writeFileSync(logFile, 'process.versions: ' + JSON.stringify(process.versions, null, 2) + '\n');
fs.writeFileSync(logFile, 'process.type: ' + process.type + '\n', { flag: 'a' });
