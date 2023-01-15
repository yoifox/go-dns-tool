var Service = require('node-windows').Service;

var svc = new Service({
  name: 'go',
  description: 'go',
  script: './server.js'
});

svc.on('install', () => {
  svc.start();
});

svc.install();