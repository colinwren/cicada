var http = require('http');
var cicada = require('../');
var run = require('comandante');

var ci = cicada('/tmp/blarg');
ci.on('commit', function (commit) {
    console.dir(commit);
    var ps = commit.spawn('ls');
    ps.stderr.pipe(process.stdout, { end : false });
    ps.stdout.pipe(process.stdout, { end : false });
    /*
    commit.run('test').on('exit', function (code) {
        var status = code === 0 ? 'PASSED' : 'FAILED';
        console.log(commit.hash + ' ' + status);
    });
    */
});

var server = http.createServer(function (req, res) {
    console.log(req.method + ' ' + req.url);
    ci.handle(req, res);
});
server.listen(5255);
