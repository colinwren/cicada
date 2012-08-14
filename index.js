var path = require('path');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;

var inherits = require('inherits');
var pushover = require('pushover');
var parseShell = require('shell-quote').parse;

var wrapCommit = require('./lib/commit');

module.exports = function (opts) {
    var c = new Cicada(opts);
    
    Object.keys(Cicada.prototype).forEach(function (key) {
        var fn = c[key];
        if (typeof fn === 'function') {
            c[key] = c[key].bind(c);
        }
    });
    return c;
};

function Cicada (opts, cb) {
    var self = this;
    
    if (!opts) opts = {};
    if (typeof opts === 'string') {
        opts = { repodir : opts + '/repo', workdir : opts + '/work' };
    }
    
    self.repodir = opts.repodir || path.join(process.cwd(), 'repo');
    self.workdir = opts.workdir || path.join(process.cwd(), 'work');
    
    var repos = self.repos = pushover(opts.repodir);
    
    repos.on('push', function (repo, commit) {
        self.emit('push', repo, commit);
        
        self.checkout(repo, commit, function (err, worker) {
            if (err) self.emit('error', err);
            self.emit('commit');
        });
    });
    if (typeof cb === 'function') self.on('push', cb);
}

inherits(Cicada, EventEmitter);

Cicada.prototype.checkout = function (repo, commit, cb) {
    var self = this;
    if (typeof cb !== 'function') cb = function () {};
    
    var id = commit + '.' + Date.now();
    var dir = path.join(self.workdir, id);
    
    function init () {
        runCommand([ 'git', 'init', '--bare', dir ], function (err) {
            if (err) cb(err)
            else fetch()
        });
    }
    
    function fetch () {
        var cmd = [ 'git', 'fetch', self.repodir ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) cb(err)
            else checkout()
        });
    }
    
    function checkout () {
        var cmd = [ 'git', 'checkout', '-b', 'master', commit ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) return cb(err);
            var c = wrapCommit({
                id : id,
                dir : dir,
                repo : repo,
                hash : commit
            });
            cb(null, c);
        });
    }
};

Cicada.prototype.handle = function (req, res) {
    var parts = req.url.split('/').slice(1);
    
    if (parts[0] === 'repo') {
        this.repos.handle(req, res);
    }
    else {
        res.end('beep boop\n');
    }
};

function runCommand (cmd, opts, cb) {
    if (typeof opts === 'function') {
        cb = opts;
        opts = {};
    }
    var ps = spawn(cmd[0], cmd.slice(1), opts);
    var data = '';
    ps.stdout.on('data', function (buf) { data += buf });
    ps.stderr.on('data', function (buf) { data += buf });
    
    var pending = 3;
    var code;
    
    function onend () {
        if (--pending !== 0) return;
        if (code !== 0) {
            cb(
                'non-zero exit code ' + code
                + ' in command: ' + cmd.join(' ') + '\n'
                + data
            );
        }
        else cb()
    }
    ps.stdout.on('end', onend);
    ps.stderr.on('end', onend);
    ps.on('exit', function (c) { code = c; onend() });
    ps.on('error', cb);
}
