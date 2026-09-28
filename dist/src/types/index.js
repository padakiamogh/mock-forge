"use strict";
/**
 * mock-forge - Type definitions for Real-Time Context-Aware API Mock Engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRecord = toRecord;
/** Convert MockOverrides to Record<string, string> for Fastify query access */
function toRecord(overrides) {
    const record = {};
    if (overrides.status !== undefined)
        record.status = String(overrides.status);
    if (overrides.delay !== undefined)
        record.delay = String(overrides.delay);
    if (overrides.error !== undefined)
        record.error = overrides.error ? 'true' : 'false';
    return record;
}
