/**
 * Shim para brotli/decompress - fontkit usa import brotli from 'brotli/decompress.js'
 * O pacote brotli é CJS. Re-exporta como default.
 */
const path = require('path');
module.exports = require(path.join(__dirname, '../../node_modules/brotli/decompress.js'));
