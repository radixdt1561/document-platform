const Piscina = require('piscina');
const path = require('path');

module.exports = new Piscina({
  filename: path.resolve(__dirname, 'report.worker.js')
});
