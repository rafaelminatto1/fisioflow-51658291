"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gemini15Pro = exports.gemini15Flash = exports.ai = void 0;
var genkit_1 = require("genkit");
var vertexai_1 = require("@genkit-ai/vertexai");
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, vertexai_1.vertexAI)({ location: 'us-central1' }),
    ],
});
// Export model references
exports.gemini15Flash = vertexai_1.vertexAI.model('gemini-1.5-flash');
exports.gemini15Pro = vertexai_1.vertexAI.model('gemini-1.5-pro');
