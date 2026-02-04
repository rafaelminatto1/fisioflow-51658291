/**
 * Shim para unicode-trie - fontkit usa "import UnicodeTrie from 'unicode-trie'"
 * mas unicode-trie é CJS. Re-exporta como default. Usamos path absoluto para
 * evitar resolução circular pelo alias do Vite.
 */
const path = require('path');
const mod = require(path.join(__dirname, '../../node_modules/unicode-trie'));
module.exports = mod;
