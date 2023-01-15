var Service = require('node-windows').Service;

var svc = new Service({
	name: 'go',
	script: require('path').join(__dirname, './server.js')
});

svc.on('uninstall',function(){
	console.log('Uninstall complete.');
});

svc.uninstall();