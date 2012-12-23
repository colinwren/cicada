var http = require('http');
var cicada = require('../');
var test = require('tap').test;
var spawn = require('child_process').spawn;
var mkdirp = require('mkdirp');

mkdirp.sync('/tmp/cicada-dirmapped-test/abcdefg');

var ci;
var server = http.createServer(function (req, res) {
    ci.handle(req, res);
});

test('setup', function (t) {
    server.listen(0, t.end.bind(t));
});

test('dir-mapped push', function (t) {
    t.plan(10);
    
    ci = cicada(function (dir) {
        t.equal(dir, 'beep.git');
        return '/tmp/cicada-dirmapped-test/abcdefg';
    });
    
    ci.on('commit', function (commit) {
        t.equal(commit.repo, 'beep.git');
        t.equal(commit.dir, '/tmp/cicada-dirmapped-test/abcdefg');
        
        (function () {
            var ps = commit.spawn('ls');
            var data = '';
            ps.stdout.on('data', function (buf) { data += buf });
            ps.on('close', function (code) {
                t.equal(code, 0);
                t.equal(data, 'robot.txt\n');
            });
        })();
        
        (function () {
            var ps = commit.spawn('pwd');
            var data = '';
            ps.stdout.on('data', function (buf) { data += buf });
            ps.on('close', function (code) {
                t.equal(code, 0);
                t.equal(data, commit.dir + '\n');
            });
        })();
    });
    
    spawn(__dirname + '/push.sh', [
        'http://localhost:' + server.address().port + '/beep.git'
    ]);
});

test('teardown', function (t) {
    server.close();
    t.end();
});
