var inherits = require('inherits');
var EventEmitter = require('events').EventEmitter;

module.exports = function (opts) {
    return new Commit(opts);
};

function Commit (opts) {
    this.id = opts.id;
    this.dir = opts.dir;
    this.repo = opts.repo;
    this.hash = opts.hash;
}

inherits(Commit, EventEmitter);

Commit.prototype.spawn = function (cmd, args, opts) {
    if (typeof cmd === 'string' && !Array.isArray(args)) {
        opts = args;
        args = parseShell(String(cmd));
        cmd = args.shift();
    }
    if (!opts) opts = {};
    if (!opts.cwd) opts.cwd = this.dir;
    
    return spawn(command[0], command.slice(1), opts);
};

Commit.prototype.run = function (scriptName, opts) {
    if (!opts) opts = {};
    return this.spawn([ 'npm', 'run-script' ].concat(scriptName), opts);
};
