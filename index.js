var pushover = require('pushover');
var inherits = require('inherits');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

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
    if (!opts) opts = {};
    if (typeof opts === 'string') opts = { repodir : opts };
    if (!opts.repodir) opts.repodir = path.join(process.cwd(), 'repo');
    
    var self = this;
    var repos = self.repos = pushover(opts.repodir);
    
    repos.on('push', function (repo) {
        self.emit('push', repo);
    });
}

inherits(Cicada, EventEmitter);

Cicada.prototype.handle = function (req, res) {
    var parts = req.url.split('/').slice(1);
    
    if (parts[0] === 'repo') {
        this.repos.handle(req, res)
    }
    else {
        res.end('beep boop\n');
    }
};
