// Comprehensive polyfills for Node.js globals in browser environment

// Global object polyfill - this is the main fix for the "global is not defined" error
(window as any).global = window;

// Buffer polyfill
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    isBuffer: function() { return false; },
    alloc: function(size: number) { return new Uint8Array(size); },
    from: function(data: any) { return new Uint8Array(data); }
  };
}

// Process polyfill
if (typeof (window as any).process === 'undefined') {
  (window as any).process = {
    env: {},
    version: '',
    versions: {},
    platform: 'browser',
    nextTick: (fn: Function) => setTimeout(fn, 0),
    browser: true,
    title: 'browser',
    argv: [],
    on: function() {},
    addListener: function() {},
    once: function() {},
    off: function() {},
    removeListener: function() {},
    removeAllListeners: function() {},
    setMaxListeners: function() {},
    getMaxListeners: function() { return 0; },
    listeners: function() { return []; },
    rawListeners: function() { return []; },
    emit: function() { return false; },
    listenerCount: function() { return 0; },
    prependListener: function() {},
    prependOnceListener: function() {},
    eventNames: function() { return []; }
  };
}

// Crypto polyfill for browser
if (typeof (window as any).crypto === 'undefined') {
  (window as any).crypto = {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {
      generateKey: function() { return Promise.resolve({}); },
      sign: function() { return Promise.resolve(new ArrayBuffer(0)); },
      verify: function() { return Promise.resolve(false); },
      digest: function() { return Promise.resolve(new ArrayBuffer(0)); },
      importKey: function() { return Promise.resolve({}); },
      exportKey: function() { return Promise.resolve(new ArrayBuffer(0)); },
      encrypt: function() { return Promise.resolve(new ArrayBuffer(0)); },
      decrypt: function() { return Promise.resolve(new ArrayBuffer(0)); },
      deriveKey: function() { return Promise.resolve({}); },
      deriveBits: function() { return Promise.resolve(new ArrayBuffer(0)); },
      wrapKey: function() { return Promise.resolve(new ArrayBuffer(0)); },
      unwrapKey: function() { return Promise.resolve({}); }
    }
  };
}

// TextEncoder/TextDecoder polyfills
if (typeof (window as any).TextEncoder === 'undefined') {
  (window as any).TextEncoder = class TextEncoder {
    encode(str: string): Uint8Array {
      return new TextEncoder().encode(str);
    }
  };
}

if (typeof (window as any).TextDecoder === 'undefined') {
  (window as any).TextDecoder = class TextDecoder {
    decode(bytes: Uint8Array): string {
      return new TextDecoder().decode(bytes);
    }
  };
}

// SetImmediate polyfill
if (typeof (window as any).setImmediate === 'undefined') {
  (window as any).setImmediate = (fn: Function) => setTimeout(fn, 0);
}

// ClearImmediate polyfill
if (typeof (window as any).clearImmediate === 'undefined') {
  (window as any).clearImmediate = (id: number) => clearTimeout(id);
}

// Additional Node.js globals that might be needed
if (typeof (window as any).__dirname === 'undefined') {
  (window as any).__dirname = '';
}

if (typeof (window as any).__filename === 'undefined') {
  (window as any).__filename = '';
}

// Console polyfill (in case it's not available)
if (typeof (window as any).console === 'undefined') {
  (window as any).console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {}
  };
}

// Stream polyfill
if (typeof (window as any).stream === 'undefined') {
  (window as any).stream = {
    Readable: class Readable {},
    Writable: class Writable {},
    Duplex: class Duplex {},
    Transform: class Transform {},
    PassThrough: class PassThrough {}
  };
}

// Util polyfill
if (typeof (window as any).util === 'undefined') {
  (window as any).util = {
    inherits: function() {},
    inspect: function() { return ''; },
    format: function() { return ''; }
  };
}

// Assert polyfill
if (typeof (window as any).assert === 'undefined') {
  (window as any).assert = function(condition: any, message?: string) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  };
}

// URL polyfill
if (typeof (window as any).url === 'undefined') {
  (window as any).url = {
    parse: function() { return {}; },
    format: function() { return ''; },
    resolve: function() { return ''; }
  };
}

// Querystring polyfill
if (typeof (window as any).querystring === 'undefined') {
  (window as any).querystring = {
    parse: function() { return {}; },
    stringify: function() { return ''; },
    escape: function() { return ''; },
    unescape: function() { return ''; }
  };
}

// Path polyfill
if (typeof (window as any).path === 'undefined') {
  (window as any).path = {
    join: function() { return ''; },
    resolve: function() { return ''; },
    normalize: function() { return ''; },
    isAbsolute: function() { return false; },
    relative: function() { return ''; },
    dirname: function() { return ''; },
    basename: function() { return ''; },
    extname: function() { return ''; },
    sep: '/',
    delimiter: ':'
  };
}

// FS polyfill (empty since we're in browser)
if (typeof (window as any).fs === 'undefined') {
  (window as any).fs = {
    readFile: function() { throw new Error('fs.readFile not available in browser'); },
    writeFile: function() { throw new Error('fs.writeFile not available in browser'); },
    exists: function() { return false; },
    stat: function() { throw new Error('fs.stat not available in browser'); }
  };
}

// Net polyfill (empty since we're in browser)
if (typeof (window as any).net === 'undefined') {
  (window as any).net = {
    createConnection: function() { throw new Error('net.createConnection not available in browser'); },
    createServer: function() { throw new Error('net.createServer not available in browser'); }
  };
}

// TLS polyfill (empty since we're in browser)
if (typeof (window as any).tls === 'undefined') {
  (window as any).tls = {
    createSecureContext: function() { throw new Error('tls.createSecureContext not available in browser'); },
    connect: function() { throw new Error('tls.connect not available in browser'); }
  };
}

console.log('Polyfills loaded successfully'); 