var pushover = require('pushover');
var inherits = require('inherits');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;

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

function Cicada (opts) {
    var self = this;
    
    if (!opts) opts = {};
    if (typeof opts === 'string') opts = { repodir : opts };
    
    self.repodir = opts.repodir || path.join(process.cwd(), 'repo');
    self.workdir = opts.workdir || path.join(process.cwd(), 'work');
    
    var repos = self.repos = pushover(opts.repodir);
    
    repos.on('push', self.emit.bind(self, 'push'));
}

inherits(Cicada, EventEmitter);

Cicada.prototype.checkout = function (repo, commit, cb) {
    var self = this;
    var dir = path.join(self.workdir, commit + '.' + Date.now());
    
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
            if (err) cb(err)
            else cb(null, dir)
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
