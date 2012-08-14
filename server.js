#!/usr/bin/env node

var http = require('http');
var cicada = require('./')();
var server = http.createServer(cicada.handle);

var port = Number(process.argv[2]) || 5255;
server.listen(port);
