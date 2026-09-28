"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTSMockHandler = exports.createOpenAPIMocks = void 0;
exports.createMockForgeServer = createMockForgeServer;
/**
 * mock-forge - Server Module
 * Fastify-based API mock engine with plugin system
 */
/* eslint-disable */
const fastify_1 = __importDefault(require("fastify"));
const mock_generator_1 = require("../mocks/mock-generator");
Object.defineProperty(exports, "createOpenAPIMocks", { enumerable: true, get: function () { return mock_generator_1.createOpenAPIMocks; } });
Object.defineProperty(exports, "createTSMockHandler", { enumerable: true, get: function () { return mock_generator_1.createTSMockHandler; } });
const state_manager_1 = require("../state/state-manager");
/** Register mock route plugins */
async function registerMockRoutes(fastify, options) {
    const { mocks } = options;
    if (!mocks) {
        fastify.log.warn('No mock definitions provided');
        return;
    }
    // Handle OpenAPI-based mocks
    if (mocks.openapi) {
        const handlers = (0, mock_generator_1.createOpenAPIMocks)(mocks.openapi, options);
        registerOpenAPIHandlers(fastify, handlers);
    }
    // Handle TypeScript-based mocks
    if (mocks.typescript) {
        for (const mockDef of mocks.typescript) {
            const handler = (0, mock_generator_1.createTSMockHandler)(mockDef);
            const path = mockDef.path.replace(/^\//, '');
            fastify.route({
                method: mockDef.method,
                url: `/${path}`,
                handler: async (request, reply) => {
                    try {
                        // Use as any to bypass Fastify type restrictions on path/queryString
                        const req = request;
                        const response = await handler(req.path, req.method, req.queryString, req.headers, req.body);
                        // Apply delay if specified
                        if (response.delay) {
                            await new Promise(resolve => setTimeout(resolve, response.delay));
                        }
                        reply.code(response.status).send(response.body);
                    }
                    catch (err) {
                        fastify.log.error(err, 'Mock handler error');
                        reply.code(500).send({ error: 'Mock handler failed' });
                    }
                },
            });
        }
    }
}
/** Register OpenAPI handler routes */
function registerOpenAPIHandlers(fastify, handlers) {
    for (const [key, handler] of handlers) {
        const [path, method] = key.split('+');
        fastify.route({
            method: method,
            url: `/${path}`,
            handler: async (request, reply) => {
                try {
                    // Use as any to bypass Fastify type restrictions
                    const req = request;
                    const response = await handler(req.path, req.method, req.queryString, req.headers, req.body);
                    // Apply delay if specified
                    if (response.delay) {
                        await new Promise(resolve => setTimeout(resolve, response.delay));
                    }
                    reply.code(response.status).send(response.body);
                }
                catch (err) {
                    const req = request;
                    fastify.log.error(err, 'Mock handler error', { path: req.path, method: req.method });
                    reply.code(500).send({ error: 'Mock handler failed' });
                }
            },
        });
    }
}
/** Create and configure the Fastify server */
async function createMockForgeServer(config = {}) {
    // Build fastify options, only passing known Fastify options
    const fastifyOptions = {
        logger: {
            level: config.loggerLevel || 'info',
        },
    };
    const fastify = (0, fastify_1.default)(fastifyOptions);
    // Initialize state database (in-memory by default)
    (0, state_manager_1.initStateDB)();
    // Register the mock routes plugin
    fastify.register(registerMockRoutes, {
        prefix: config.prefix || '/mock',
    });
    // Health check endpoint
    fastify.get('/health', async () => {
        return { status: 'ok', service: 'mock-forge' };
    });
    // SSE endpoint for real-time updates
    fastify.get('/sse', async (request, reply) => {
        // Use as any to bypass type restrictions
        const rep = reply;
        rep.send({ type: 'connection', timestamp: Date.now() });
        // SSE setup - reply with appropriate headers
        rep.header('Content-Type', 'text/event-stream');
        rep.header('Cache-Control', 'no-cache');
        rep.header('Connection', 'keep-alive');
    });
    fastify.log.info('mock-forge server initialized');
    return fastify;
}
