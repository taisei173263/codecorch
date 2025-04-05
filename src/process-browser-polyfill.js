/* Process Browser Polyfill */
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = {
    env: {},
    browser: true,
    version: '',
    versions: {},
    nextTick: function (cb) {
      setTimeout(cb, 0);
    },
    title: 'browser',
    argv: [],
    on: function() {}
  };
}

export default window.process; 