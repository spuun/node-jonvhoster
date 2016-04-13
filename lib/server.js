'use strict';
const http	= require('http');
const fs		= require('fs');
const path	= require('path');

const loadSite = (sitePath, cb) => {
	fs.stat(sitePath, (err, info) => {
		if (err) {
			cb(err);
			return;
		}
		if (!info.isDirectory()) {
			cb(new Error(`Site path is not a directory: ${sitePath}`));
		}
		try {
			var cacheKey = require.resolve(sitePath);
			if (require.cache[cacheKey]) {
				delete require.cache[cacheKey];
			}
			var pwd = process.cwd();
			process.chdir(sitePath);
			cb(null, require(sitePath));
			process.chdir(pwd);
		} catch (e) {
			cb(new Error(`Cannot load site from ${sitePath}: ${e.message}`));
		}
	});
};

const loadSitesFromPath = (sitesPath, cb) => {
	fs.stat(sitesPath, (err, info) => {
		if (err) {
			cb(err);
			return;
		}
		if (!info.isDirectory()) {
			cb(new Error(`Sites path is not a directory: ${sitesPath}`));
			return;
		}
		fs.readdir(sitesPath, (err, files) => {
			if (err) {
				cb(err);
				return;
			}
			let sites = {};
			let filesLeft = files.length;
			const checkAllLoaded = () => {
				if (filesLeft > 0) {
					return;
				}
				cb(null, sites);
			};
			files.forEach(file => {
				let sitePath = path.join(sitesPath, file);
				if (sitePath[0] != '/') {
					sitePath = path.join(process.cwd(), sitePath);
				}
				loadSite(sitePath, (err, site) => {
					if (!err) {
						console.log(`Loading ${file}`);
						sites[file] = site;
					} else {
						console.log(err)
					}
					--filesLeft;
					checkAllLoaded();
				});
			});
		});
	});
};

const createServer = (config) => {
	config = Object.assign(require('./config.js'), config);
	let sites = {};
	if (config.port < 1024 && process.geteuid() != 0) {
		throw new Error('Must be run as root to listen to port < 1024.');
	}
	const loadSites = () => {
		loadSitesFromPath(config.sites, (err, loadedSites) => {
			if (err) {
				console.log(err);
				return;
			}
			sites = loadedSites;
		});
	};
	const admin = (req, res) => {
		var command = req.url.replace(/^\//,'');
		config.admin.challange(req, res, () => {
			if (command == 'reload') {
				console.log('Reloading sites');
				loadSites();
			}
			res.end('ok');
		});
	}
	const isAdminHost = (host) => {
		if (config.admin.site instanceof RegExp) {
			return config.admin.site.test(host);
		}
		return host == config.admin.site;
	};
	const server = http.createServer((req, res) => {
		var host = (req.headers.host||'').toLowerCase();
		if (isAdminHost(host)) {
			admin(req, res);
			return;
		}
		const site = host.replace(/^www\.|:\d+$/g, '');
		console.log(`Requested site: ${site}`);
		if (!sites.hasOwnProperty(site)) {
			console.log(`No site site '${site}'. Responding with 404.`);
			res.statusCode = 404;
			res.end('No such site here :-(');
		} else {
			try {
				sites[site](req, res);	
			} catch(err) {
				console.log(`Error in '${site}': ${err}`);
				res.statusCode = 500;
				res.end('Ouch, internal server error!');
			}
		}
	});
	server.listen(config.port, () => {
		if (config.port < 1024) {
			try {
				process.setgid(config.group);
				process.setuid(config.user);
				console.log(`Runnings as ${config.user}`);
			} catch (err) {
				throw new Error('Failed to drop privileges.');
			}
		}	
		console.log(`Server up and running on port ${config.port}`);
	});
	loadSites();
	return {};	
};

module.exports = createServer;
