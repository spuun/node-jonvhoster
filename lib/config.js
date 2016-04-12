'use strict';
module.exports = {
	port: 80,
	sites: './sites',
	admin: {
		site: /^admin\./,
		challange: (req, res, cb) => {
			const requireAuthorization = () => {
				res.setHeader('WWW-Authenticate', 'Basic realm="Admin ok?"');
				res.statusCode = 401;
				res.end('Who are you?');
			}
			if (!req.headers.authorization) {
				return requireAuthorization();
			}
			let authVal = req.headers.authorization.replace(/^.*Basic /,'');
			let parts = new Buffer(authVal, 'base64').toString('utf-8').split(':');
			if (parts[0] != parts[1]) {
				return requireAuthorization();
			}
			cb();
		}
	},
	user: 'www-data',
	group: 'www-data',
};
