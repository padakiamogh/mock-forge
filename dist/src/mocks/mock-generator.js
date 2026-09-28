"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenAPIMocks = createOpenAPIMocks;
exports.createTSMockHandler = createTSMockHandler;
exports.generateLLMResponse = generateLLMResponse;
const context_evaluator_1 = require("../context/context-evaluator");
const state_manager_1 = require("../state/state-manager");
/** Load OpenAPI specification and generate mock handlers */
function createOpenAPIMocks(spec, config = {}) {
    const handlers = new Map();
    // Parse spec if string
    const specObj = typeof spec === 'string' ? JSON.parse(spec) : spec;
    if (!specObj.paths) {
        throw new Error('Invalid OpenAPI spec: missing paths');
    }
    for (const [path, pathItem] of Object.entries(specObj.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
            const op = operation;
            const httpMethod = method.toUpperCase();
            if (httpMethod && op && op.responses) {
                handlers.set(`${path}+${httpMethod}`, createOpenAPIHandler(path, httpMethod, operation));
            }
        }
    }
    return handlers;
}
/** Create a single OpenAPI-based mock handler */
function createOpenAPIHandler(path, method, operation) {
    return async (requestPath, method, rawQuery, headers, body) => {
        const overrides = (0, context_evaluator_1.extractOverrides)(rawQuery);
        // Start with default 200 response
        const defaultResponse = {
            status: overrides.status || 200,
            body: {},
        };
        // If there are defined responses for this status, use them
        if (operation.responses) {
            // Check for override status
            const effectiveStatus = overrides.status || 200;
            if (operation.responses[effectiveStatus]) {
                const resp = operation.responses[effectiveStatus];
                defaultResponse.body = resp.body || {};
                defaultResponse.headers = resp.headers;
            }
            else if (operation.responses['200']) {
                // Fallback to 200 response
                const resp = operation.responses['200'];
                defaultResponse.body = resp.body || {};
                defaultResponse.headers = resp.headers;
            }
        }
        // Context-aware processing
        const context = {
            path: requestPath,
            method,
            query: (0, context_evaluator_1.parseQueryString)(rawQuery),
            headers,
            body,
            session: {},
            overrides,
        };
        // Process through auth/filter pipeline
        const processed = await (0, context_evaluator_1.processMockResponse)(defaultResponse, context);
        // State management for CRUD operations
        if (processed.status >= 200 && processed.status < 300 && body) {
            const sessionId = headers['x-session-id'] || 'default';
            (0, state_manager_1.initStateDB)();
            // Log the mutation
            (0, state_manager_1.logMutation)(sessionId, requestPath, method, body);
            // Apply to session state
            const state = (0, state_manager_1.getSessionState)(sessionId);
            const updatedState = (0, state_manager_1.applyMutation)(sessionId, requestPath, method, body);
            // Store state on context for future requests
            context.session = updatedState;
        }
        return {
            status: processed.status,
            body: processed.body,
            delay: processed.delay,
        };
    };
}
/** Create TypeScript-based mock handler */
function createTSMockHandler(mockDef) {
    return async (requestPath, method, rawQuery, headers, body) => {
        const overrides = (0, context_evaluator_1.extractOverrides)(rawQuery);
        const context = {
            path: requestPath,
            method,
            query: (0, context_evaluator_1.parseQueryString)(rawQuery),
            headers,
            body,
            session: {},
            overrides,
        };
        // Handle both sync and async handlers
        const result = mockDef.handler(context);
        // Handle both promise and sync return values
        const processed = result instanceof Promise ? await result : Promise.resolve(result);
        // State management
        if (processed.status >= 200 && processed.status < 300 && body) {
            const sessionId = headers['x-session-id'] || 'default';
            (0, state_manager_1.initStateDB)();
            (0, state_manager_1.logMutation)(sessionId, requestPath, method, body);
            const state = (0, state_manager_1.getSessionState)(sessionId);
            (0, state_manager_1.applyMutation)(sessionId, requestPath, method, body);
            context.session = state;
        }
        return {
            status: processed.status,
            body: processed.body,
            delay: processed.delay,
        };
    };
}
/** Generate a dynamic LLM fallback response for unhandled payloads */
async function generateLLMResponse(payload, config) {
    if (!config.llmFallback?.enabled) {
        return {
            status: 501,
            body: { error: 'LLM fallback not configured' },
        };
    }
    // TODO: Integrate with OpenCode API or other LLM service
    // For now, return a generic structured response
    return {
        status: 200,
        body: {
            note: 'LLM fallback triggered',
            payloadSummary: typeof payload === 'object' ? Object.keys(payload).slice(0, 5) : [String(payload)].slice(0, 5),
            generatedAt: new Date().toISOString(),
        },
    };
}
