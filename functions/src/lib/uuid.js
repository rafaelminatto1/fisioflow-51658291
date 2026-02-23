"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidUuid = isValidUuid;
exports.toValidUuid = toValidUuid;
var UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(value) {
    if (typeof value !== 'string')
        return false;
    return UUID_REGEX.test(value.trim());
}
function toValidUuid(value) {
    if (!isValidUuid(value))
        return null;
    return value.trim();
}
