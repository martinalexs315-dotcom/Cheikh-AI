const { app, startServer } = require('../dist/server.cjs');

let initialized = false;

module.exports = async function (req, res) {
  if (!initialized) {
    if (typeof startServer === 'function') {
      await startServer();
    }
    initialized = true;
  }
  return app(req, res);
};
