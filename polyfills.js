// polyfills.js
if (typeof globalThis.DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    name;
    code;

    constructor(message = '', name = 'Error') {
      super(message);
      this.name = name;
      this.message = message;
      this.code = 0;
      Object.setPrototypeOf(this, DOMExceptionPolyfill.prototype);
    }
  }

  globalThis.DOMException = DOMExceptionPolyfill;
  
  // Also set on global for older React Native versions
  if (typeof global !== 'undefined') {
    global.DOMException = DOMExceptionPolyfill;
  }
}