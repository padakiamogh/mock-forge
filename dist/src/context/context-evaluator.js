"use strict";
/**
 * mock-forge - Context Evaluator Module
 * Evaluates request metadata, query overrides, auth headers, and override flags
 * @ts-nocheck
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseQueryString = parseQueryString;
exports.extractOverrides = extractOverrides;
exports.createMockContext = createMockContext;
exports.applyStatusOverride = applyStatusOverride;
exports.applyDelayOverride = applyDelayOverride;
exports.evaluateAuthContext = evaluateAuthContext;
exports.filterBodyByAuth = filterBodyByAuth;
exports.processMockResponse = processMockResponse;
/** Parse query string into key-value record */
function parseQueryString(query) {
    const params = {};
    if (!query)
        return params;
    for (const part of query.split('&')) {
        const [key, value] = part.split('=');
        if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
        }
    }
    return params;
}
/** Extract override flags from query parameters */
function extractOverrides(query) {
    const raw = parseQueryString(query);
    const overrides = {};
    if (raw.status !== undefined) {
        overrides.status = Number(raw.status);
    }
    if (raw.delay !== undefined) {
        overrides.delay = Number(raw.delay);
    }
    if (raw.error !== undefined) {
        overrides.error = raw.error === 'true';
    }
    return overrides;
}
/** Extract and enrich mock context from Fastify request */
function createMockContext(requestPath, method, rawQuery, headers, body) {
    return {
        path: requestPath,
        method,
        query: parseQueryString(rawQuery),
        headers,
        body,
        session: {}, // Will be populated by session middleware
        overrides: extractOverrides(rawQuery),
    };
}
/** Evaluate whether to apply an override status code */
function applyStatusOverride(response, overrides) {
    if (overrides.status && overrides.status >= 100 && overrides.status <= 599) {
        return {
            ...response,
            status: overrides.status,
        };
    }
    return response;
}
/** Apply delay override if specified */
async function applyDelayOverride(response, overrides) {
    if (overrides.delay && overrides.delay > 0) {
        // We'll just return the response with delay info;
        // the caller should handle the actual waiting
        return {
            ...response,
            delay: overrides.delay,
        };
    }
    return response;
}
/** Simulate auth header evaluation (admin vs standard user) */
function evaluateAuthContext(headers) {
    const auth = headers.authorization || headers.Authorization;
    const token = auth ? auth.split(' ')[1] : '';
    // Simple heuristic: if token contains 'admin' or specific admin key
    if (/admin/i.test(token) || token === 'admin-secret') {
        return 'admin';
    }
    if (token) {
        return 'standard';
    }
    return 'anonymous';
}
/** Filter response body based on auth context */
function filterBodyByAuth(body, authContext) {
    if (typeof body !== 'object' || body === null)
        return body;
    const obj = body;
    // Remove admin-only fields from standard users
    if (authContext !== 'admin') {
        const safeObj = {};
        for (const [key, value] of Object.entries(obj)) {
            // Common patterns for admin-only fields
            if (!key.includes('secret') &&
                !key.includes('token') &&
                !key.includes('internal') &&
                !key.includes('admin') &&
                !key.includes('password')) {
                safeObj[key] = value;
            }
        }
        return safeObj;
    }
    return obj;
}
/** Full mock response pipeline */
async function processMockResponse(response, context) {
    let processed = response;
    // Apply overrides
    if (context.overrides.status) {
        processed = { ...processed, status: context.overrides.status };
    }
    if (context.overrides.delay) {
        processed = { ...processed, delay: context.overrides.delay };
    }
    // Apply auth filtering if body exists
    if (processed.body) {
        const auth = evaluateAuthContext(context.headers);
        processed.body = filterBodyByAuth(processed.body, auth);
    }
    return processed;
}
