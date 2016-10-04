
/**
 * Module dependencies.
 */

var callsite = require('callsite')
  , tty = require('tty')
  , isatty = Boolean(tty.isatty(2) && process.stdout.getWindowSize)
  , defaultColors = { log: '90', error: '91', warn: '93', info: '96', trace: '90' }


/**
 * Store custom options
 *
 * @param {Object} options
 * @api public
 */

module.exports = function debugTrace(options) {
  options = options || {};
  console.traceOptions = console.traceOptions || {};
  console.traceOptions.cwd = options.cwd || process.cwd() + '/';
  console.traceOptions.colors = typeof options.colors !== 'undefined' ? options.colors : true;
  console.traceOptions.always = typeof options.always !== 'undefined' ? options.always : true;
  console.traceOptions.right = typeof options.right !== 'undefined' ? options.right : false;
}

  /**
   * Overrides the console methods.
   */

  ;['error', 'log', 'info', 'warn', 'trace'].forEach(function (name) {
    var fn = console[name];
    console[name] = function () {
      if (console._trace || console.traceOptions.always) {
        if (Buffer.isBuffer(arguments[0])) {
          arguments[0] = arguments[0].inspect()
        } else if (typeof arguments[0] === 'object') {
          arguments[0] = JSON.stringify(arguments[0], null, '  ');
        }
        var pad = (arguments[0] && !console.traceOptions.right || !isatty ? ' ' : '');
        // when using the debug module: dig one level deeper in the stack
        var stack = callsite();
        var trace = stack[1];
        if (stack.length > 2 && trace.getFunctionName() === 'log') {
          trace = stack[3];
          trace.debug = true;
        }
        trace.debug = trace.debug || false;
        arguments[0] = console.traceFormat(trace, name) + pad + arguments[0];
      }
      console._trace = false;
      return fn.apply(this, arguments);
    }
  });

/**
 * Overridable formatting function.
 *
 * @param {CallSite}
 * @param {String} calling method
 * @api public
 */

console.traceFormat = function (call, method) {
  var options = {};
  call.filename = call.getFileName().replace(console.traceOptions.cwd, '');
  call.method = method;
  call.functionName = call.getFunctionName() || 'anonymous'
  call.getDate = function getDate() {
    return new Date().toISOString().replace('T', ' ').replace('Z', '');
  }

  var str = console.format(call);
  var color = '99';

  if (!isatty) {
    return str;
  }

  if (console.traceOptions.colors !== false) {
    if (console.traceOptions.colors === undefined || console.traceOptions.colors[method] === undefined) {
      color = defaultColors[method];
    } else {
      color = console.traceOptions.colors[method];
    }
  }

  if (console.traceOptions.right) {
    var rowWidth = process.stdout.getWindowSize()[0];
    return '\033[s' + // save current position
      '\033[' + rowWidth + 'D' + // move to the start of the line
      '\033[' + (rowWidth - str.length) + 'C' + // align right
      '\033[' + color + 'm' + str + '\033[39m' +
      '\033[u'; // restore current position
  } else {
    return '\033[' + color + 'm' + str + '\033[39m';
  }
}


/**
 * Overridable string formatting function.
 *
 * @param {CallSite} CallSite Object pimped with additional properties.
 * @api public
 */
console.format = function (c) {
  return c.getDate() + ": [" + c.filename + ":" + c.getLineNumber() + "] " + c.functionName;
};

/**
 * Adds trace getter to the `console` object.
 *
 * @api public
 */

function getter() {
  this._trace = true;
  return this;
}

Object.defineProperty(console, 't', { get: getter });
Object.defineProperty(console, 'traced', { get: getter });
