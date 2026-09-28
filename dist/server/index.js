"use strict";
/**
 * mock-forge - Server Module
 * Fastify-based API mock engine with plugin system
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockForgeServer = createMockForgeServer;
const fastify_1 = __importDefault(require("fastify"));
const mock_generator_1 = require("../mocks/mock-generator");
const mock_generator_2 = require("../mocks/mock-generator");
const state_manager_1 = require("../state/state-manager");
/** Create and configure the Fastify server */
async function createMockForgeServer(config = {}) {
    const fastify = (0, fastify_1.default)({
        logger: {
            level: config.loggerLevel || 'info',
            transport: {
                target: 'pino-pretty',
                options: { singleLine: true },
            },
        },
    });
    // Initialize state database (in-memory by default)
    (0, state_manager_1.initStateDB)();
    // Register the mock routes plugin
    fastify.register(registerMockRoutes, {
        prefix: config.prefix || '/mock',
        ...config,
    });
    // Health check endpoint
    fastify.get('/health', async () => {
        return { status: 'ok', service: 'mock-forge' };
    });
    // SSE endpoint for real-time updates
    fastify.get('/sse', async (request, reply) => {
        reply.sse();
        // Send initial connection message
        reply.sse({ type: 'connection', timestamp: Date.now() });
        // Keep connection alive and handle cleanup
        request.raw.on('close', () => {
            fastify.log.info('SSE client disconnected');
        });
    });
    fastify.log.info('mock-forge server initialized');
    return fastify;
}
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
        registerHandlers(fastify, handlers, '/openapi');
    }
    // Handle TypeScript-based mocks
    if (mocks.typescript) {
        for (const mockDef of mocks.typescript) {
            const handler = (0, mock_generator_2.createTSMockHandler)(mockDef);
            const path = mockDef.path.replace(/^\//, '');
            fastify.route({
                method: mockDef.method,
                url: `/${path}`,
                handler: async (request, reply) => {
                    try {
                        const response = await handler(request.path, request.method, request.queryString, request.headers, request.body);
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
function registerHandlers(fastify, handlers, prefix) {
    for (const [key, handler] of handlers) {
        const [path, method] = key.split('+');
        fastify.route({
            method,
            url: `/${path}`,
            handler: async (request, reply) => {
                try {
                    const response = await handler(request.path, request.method, request.queryString, request.headers, request.body);
                    // Apply delay if specified
                    if (response.delay) {
                        await new Promise(resolve => setTimeout(resolve, response.delay));
                    }
                    reply.code(response.status).send(response.body);
                }
                catch (err) {
                    fastify.log.error(err, 'Mock handler error', { path: request.path, method: request.method });
                    reply.code(500).send({ error: 'Mock handler failed' });
                }
            },
        });
    }
}
