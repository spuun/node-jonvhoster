# Jon Vhost Router
So i just can add folders for new sites..

## Example 
```javascript
var jvr = require('jonvhoster');
var server = jvr({
	port: 80,
	sites: '/var/www/'
});
```
then add sites in `/var/www` like `/var/www/domain.tld` and `/var/www/sub.domain.tld`. Example code for a site:
```javascript
module.exports = (req, res) => {
	res.end('Hi from sub.domain.tdl!');
};
```

### Middleware
Simple console logging middleware
```javascript
server.addMiddleWare((req,res,next) => {
	console.log(`Request to ${req.url}`);
	next(),
});
```
