var path = require('path');
var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

var pushover = require('pushover');
var spawn = require('child_process').spawn;
var parseShell = require('shell-quote').parse;

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
    if (typeof opts === 'string') {
        opts = { repodir : opts + '/repo', workdir : opts + '/work' };
    }
    
    self.repodir = opts.repodir || path.join(process.cwd(), 'repo');
    self.workdir = opts.workdir || path.join(process.cwd(), 'work');
    
    var repos = self.repos = pushover(opts.repodir);
    
    repos.on('push', self.emit.bind(self, 'push'));
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
            if (err) cb(err)
            else cb(null, dir)
        });
    }
};

Cicada.prototype.run = function (dir, command) {
    var self = this;
    
    if (!Array.isArray(command)) {
        command = parseShell(String(command));
    }
    
    var ps = spawn(command[0], command.slice(1), { cwd : dir });
    
    // var scraper = jsonScrape();
    // scraper.on('...', ...);
    // ps.stdout.pipe(scraper);
    
    return ps;
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
