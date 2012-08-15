var path = require('path');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var mkdirp = require('mkdirp');

var inherits = require('inherits');
var pushover = require('pushover');
var parseShell = require('shell-quote').parse;

var wrapCommit = require('./lib/commit');
var runCommand = require('./lib/command');

module.exports = function (opts) {
    var c = new Cicada(opts);
    c.handle = c.handle.bind(c);
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
    mkdirp.sync(self.repodir);
    mkdirp.sync(self.workdir);
    
    var repos = self.repos = pushover(opts.repodir);
    
    repos.on('push', function (repo, commit, branch) {
        self.emit('push', repo, commit, branch);
        
        self.checkout(repo, commit, branch, function (err, c) {
            if (err) self.emit('error', err)
            else self.emit('commit', c)
        });
    });
    if (typeof cb === 'function') self.on('push', cb);
}

inherits(Cicada, EventEmitter);

Cicada.prototype.checkout = function (repo, commit, branch, cb) {
    var self = this;
    if (typeof cb !== 'function') cb = function () {};
    
    var id = commit + '.' + Date.now();
    var dir = path.join(self.workdir, id);
    init();
    
    function init () {
        runCommand([ 'git', 'init', dir ], function (err) {
            if (err) cb(err)
            else fetch()
        });
    }
    
    function fetch () {
        var cmd = [ 'git', 'fetch', path.join(self.repodir, repo), branch ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) cb(err)
            else checkout()
        });
    }
    
    function checkout () {
        var cmd = [ 'git', 'checkout', '-b', branch, commit ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) return cb(err);
            var c = wrapCommit({
                id : id,
                dir : dir,
                repo : repo,
                branch : branch,
                hash : commit
            });
            cb(null, c);
        });
    }
};

Cicada.prototype.handle = function (req, res) {
    if (req.url === '/') {
        res.end('beep boop\n');
    }
    else this.repos.handle(req, res);
};
