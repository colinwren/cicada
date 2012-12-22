var path = require('path');
var EventEmitter = require('events').EventEmitter;
var spawn = require('child_process').spawn;
var mkdirp = require('mkdirp');

var inherits = require('inherits');
var pushover = require('pushover');
var parseShell = require('shell-quote').parse;

var wrapCommit = require('./lib/commit');
var runCommand = require('./lib/command');

module.exports = function (basedir, opts) {
    var c = new Cicada(basedir, opts);
    c.handle = c.handle.bind(c);
    return c;
};

function Cicada (basedir, opts) {
    var self = this;
    
    if (!opts) opts = {};
    if (typeof basedir === 'object') {
        opts = basedir;
        basedir = undefined;
    }
    if (typeof basedir === 'string') {
        if (!opts.repodir) opts.repodir = basedir + '/repo';
        if (!opts.workdir) opts.workdir = basedir + '/work';
    }
    
    self.repodir = opts.repodir || path.join(process.cwd(), 'repo');
    self.workdir = opts.workdir || path.join(process.cwd(), 'work');
    mkdirp.sync(self.repodir);
    mkdirp.sync(self.workdir);
    
    var repos = self.repos = pushover(opts.repodir, opts);
    
    function accept (name) {
        return function (ev) {
            var anyListeners = self.listeners(name).length > 0;
            self.emit(name, ev);
            if (!anyListeners) ev.accept();
        }
    }
    repos.on('info', accept('info'));
    repos.on('fetch', accept('fetch'));
    repos.on('head', accept('head'));
    
    repos.on('push', function (push) {
        var anyListeners = self.listeners('push').length > 0;
        push.on('accept', function () {
            push.on('exit', function (code) {
                if (code !== 0) {
                    return self.emit('error', 'push failed with ' + code);
                }
                self.checkout(push, function (err, c) {
                    if (err) self.emit('error', err)
                    else self.emit('commit', c)
                });
            });
        });
        self.emit('push', push);
        if (!anyListeners) push.accept();
    });
}

inherits(Cicada, EventEmitter);

Cicada.prototype.checkout = function (target, cb) {
    var self = this;
    if (typeof cb !== 'function') cb = function () {};
    
    var id = target.commit + '.' + Date.now();
    var dir = path.join(self.workdir, id);
    init();
    
    function init () {
        runCommand([ 'git', 'init', dir ], function (err) {
            if (err) cb(err)
            else fetch()
        });
    }
    
    function fetch () {
        var cmd = [
            'git', 'fetch',
            path.join(self.repodir, target.repo),
            target.branch,
        ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) cb(err)
            else checkout()
        });
    }
    
    function checkout () {
        var cmd = [ 'git', 'checkout', '-b', target.branch, target.commit ];
        runCommand(cmd, { cwd : dir }, function (err) {
            if (err) return cb(err);
            var c = wrapCommit({
                id : id,
                dir : dir,
                repo : target.repo,
                branch : target.branch,
                hash : target.commit
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
