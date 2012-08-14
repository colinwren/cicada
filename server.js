var http = require('http');
var cicada = require('./');

var ci = cicada();
ci.on('commit', function (commit) {
    var ps = commit.run('test');
    ps.on('exit', function (code) {
        var msg = code === 0 ? 'PASSED' : 'FAILED';
        console.log('/!\\ ' + msg + ' /!\\');
    });
});

var server = http.createServer(cicada.handle);
server.listen(5255);
