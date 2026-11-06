var http = require('http');
var fs = require('fs');
var url = require('url');
var crypto = require('crypto');

var server = http.createServer(function (req, res) {
  var parsed = url.parse(req.url, true);
  var file = './public' + parsed.pathname;
  fs.exists(file, function (exists) {
    if (!exists) {
      res.writeHead(404);
      return res.end('not found');
    }
    fs.readFile(file, function (err, data) {
      var token = new Buffer(data.length.toString());
      var cipher = crypto.createCipher('aes192', 'secret');
      res.setHeader('x-token', cipher.update(token, 'utf8', 'hex'));
      res.end(data);
    });
  });
});

server.listen(8080);
