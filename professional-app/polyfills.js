// Polyfill para whatwg-fetch
if (!global.fetch) {
  global.fetch = require('node-fetch').default;
}
if (!global.Request) {
  global.Request = require('node-fetch').Request;
}
if (!global.Response) {
  global.Response = require('node-fetch').Response;
}
