// Polyfill para fetch em React Native
// React Native 0.81+ tem fetch nativo, mas alguns pacotes ainda esperam polyfill

if (typeof global.fetch === 'undefined') {
  // Usar o fetch do React Native se disponível
  if (typeof self !== 'undefined' && self.fetch) {
    global.fetch = self.fetch;
    global.Request = self.Request;
    global.Response = self.Response;
    global.Headers = self.Headers;
  } else {
    // Se não estiver disponível, require whatwg-fetch
    require('whatwg-fetch');
  }
}

module.exports = {};
