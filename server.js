const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const serveIndex = require('serve-index');
const { exec } = require('child_process');
const request = require('request');

let config = JSON.parse(fs.readFileSync(path.join(__dirname, './config.json')));
let links = JSON.parse(fs.readFileSync(path.join(__dirname, './links.json')));

const authorize = (hostname) => {
	for(const key of Object.keys(links.name)) {
		if(key == hostname) return true;
		if(key + '.' == hostname) return true;
		if(key + '.' + config.suffix == hostname) return true;
	}
	
	for(const key of Object.keys(links.proxy)) {
		if(key == hostname) return true;
		if(key + '.' == hostname) return true;
		if(key + '.' + config.suffix == hostname) return true;
	}
	
	return false;
}

app.use((req,res,next) => {
	if (authorize(req.hostname)) 
		next();
	else
		res.status(401).end();
});

app.use(express.static('public'));
app.use('/root', serveIndex(path.join(__dirname, 'public/root')));

const goName = links.name.name;
const defaultGoLink = links.name[goName];

app.on('/reload', (req, res) => {
	links = JSON.parse(fs.readFileSync(path.join(__dirname, './links.json')));
	config = JSON.parse(fs.readFileSync(path.join(__dirname, './config.json')));
});

const isHostnameGO = hostname => {
	if(goName == hostname) return true;
	if(goName + '.' == hostname) return true;
	if(goName + '.' + config.suffix == hostname) return true;
	return false;
}

const getProxyLink = hostname => {
	for(const [key, value] of Object.entries(links.proxy)) {
		if(key == hostname) return value;
		if(key + '.' == hostname) return value;
		if(key + '.' + config.suffix == hostname) return value;
	}
}

const getRedirectLink = hostname => {
	for(const [key, value] of Object.entries(links.redirect)) {
		if(key == hostname) return value;
		if(key + '.' == hostname) return value;
		if(key + '.' + config.suffix == hostname) return value;
	}
}

const handleHttpRequest = (req, res) => {
	if(isHostnameGO(req.hostname)) {
		if(req.path != '/') {
			let link = req.path.split('/')[1];
			res.redirect(links.name[link] || defaultGoLink);
		} else {
			res.redirect(defaultGoLink);
		}
	} else {
		let proxyLink = getProxyLink(req.hostname);
		if(proxyLink) {
			req.pipe(request(proxyLink + req.url)).pipe(res);
			return;
		}
		let redirectLink = getRedirectLink(req.hostname);
		if(redirectLink) {
			res.redirect(redirectLink + req.url);
			return;
		}
		res.status(404).end();
	}
}

app.post('*', handleHttpRequest);
app.get('*', handleHttpRequest);

app.listen(config.httpPort);

//-------- dns --------//


const dns2 = require('dns2');
const { Packet } = dns2;
let server;

const start = async () => {
	server = dns2.createServer({
		udp: true,
		doh: {
			ssl: true,
			cert: fs.readFileSync(path.join(__dirname, './dns/server.crt')),
			key: fs.readFileSync(path.join(__dirname, './dns/secret.key')),
		},
		handle: async (request, send, rinfo) => {
			let [ question ] = request.questions;
			let { name } = question;
			if(name.endsWith('.' + config.suffix)) {
				name = name.replace(new RegExp('\.' + config.suffix + '$'), '');
			} else if(name.endsWith('.')) {
				name = name.replace(/\.$/, '');
			}
			let dotlessName = name;
			if(
				name == goName ||
				name.startsWith('localhost') ||
				name == `${goName}.${config.suffix}` ||
				name.startsWith('puki')) {
				address = config.host;
			} else {
				const host = links.proxy[dotlessName];
				if(host) {
					address = config.host;
				} else {
					const redirectHost = links.redirect[dotlessName];
					if(redirectHost) {
						address = config.host;
					} else {
						return;
					}
				}
			}
			const response = Packet.createResponseFromRequest(request);
			response.answers.push({
				name,
				type: Packet.TYPE.A,
				class: Packet.CLASS.IN,
				ttl: 30000,
				address
			});
			await send(response);
			await server.close();
			await start();
		}
	});
	await server.listen({
		doh: {
			port: 443,
			address: config.localhost,
			type: "doh4"
		},
		udp: { 
			port: 53,
			address: config.localhost,
			type: "udp4"
		},
	});
}
start();

process.on('SIGINT', () => {
	server.close();
});