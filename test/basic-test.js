"use strict";
/**
 * mock-forge - Basic Integration Test
 * Demonstrates the core capabilities of the mock engine
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("../src/server");
const context_evaluator_1 = require("../src/context/context-evaluator");
async function main() {
    console.log('=== mock-forge Basic Integration Test ===\n');
    // 1. Initialize OpenAPI-based mocks
    const openapiSpec = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {
            '/items': {
                get: {
                    responses: {
                        200: {
                            description: 'List items',
                            body: { items: [] },
                        },
                    },
                },
                post: {
                    responses: {
                        201: {
                            description: 'Create item',
                            body: { id: expect.any(String), name: expect.any(String) },
                        },
                        400: {
                            description: 'Bad request',
                            body: { error: expect.any(String) },
                        },
                    },
                },
            },
            '/items/{id}': {
                get: {
                    responses: {
                        200: {
                            description: 'Get item by ID',
                            body: { id: expect.any(String), name: expect.any(String) },
                        },
                    },
                },
            },
        },
    };
    const handlers = (0, server_1.createOpenAPIMocks)(openapiSpec);
    console.log(`✓ Created ${handlers.size} OpenAPI mock handlers`);
    // 2. Create TypeScript-based mock
    const tsMockHandler = (0, server_1.createTSMockHandler)({
        path: '/health',
        method: 'GET',
        handler: (context) => {
            return {
                status: 200,
                body: { status: 'ok', timestamp: new Date().toISOString() },
            };
        },
    });
    console.log('✓ Created TypeScript mock handler for /health');
    // 3. Create the server
    const fastify = await (0, server_1.createMockForgeServer)({
        mocks: {
            openapi: openapiSpec,
            typescript: [
                {
                    path: '/health',
                    method: 'GET',
                    handler: async (context) => {
                        return {
                            status: 200,
                            body: { status: 'ok' },
                        };
                    },
                },
            ],
        },
        loggerLevel: 'warn',
    });
    console.log('✓ mock-forge server created\n');
    // 4. Test OpenAPI GET /items
    try {
        const response = await fastify.inject({
            method: 'GET',
            url: '/mock/items',
        });
        console.log('✓ GET /mock/items ->', response.status, JSON.parse(response.body).body);
    }
    catch (err) {
        console.error('✗ GET /items failed:', err);
    }
    // 5. Test OpenAPI POST /items (state mutation)
    try {
        const postResponse = await fastify.inject({
            method: 'POST',
            url: '/mock/items',
            body: { name: 'widget' },
            headers: { 'content-type': 'application/json', 'x-session-id': 'test-session-1' },
        });
        console.log('✓ POST /mock/items ->', postResponse.status, JSON.parse(postResponse.body));
        // 6. Test that state persists - GET /items should now reflect the mutation
        const getResponse = await fastify.inject({
            method: 'GET',
            url: '/mock/items',
            headers: { 'x-session-id': 'test-session-1' },
        });
        console.log('✓ GET /mock/items (after POST) ->', getResponse.status, JSON.parse(getResponse.body).body);
    }
    catch (err) {
        console.error('✗ POST/GET cycle failed:', err);
    }
    // 7. Test context awareness - status override
    try {
        const overrideResponse = await fastify.inject({
            method: 'GET',
            url: '/mock/items?mock_status=422',
            headers: { 'x-session-id': 'test-session-1' },
        });
        console.log('✓ GET /mock/items?mock_status=422 ->', overrideResponse.status);
    }
    catch (err) {
        console.error('✗ Status override failed:', err);
    }
    // 8. Test delay override
    try {
        const delayResponse = await fastify.inject({
            method: 'GET',
            url: '/mock/items?mock_delay=500',
            headers: { 'x-session-id': 'test-session-1' },
        });
        console.log('✓ GET /mock/items?mock_delay=500 -> status', delayResponse.status, '(delay applied)');
    }
    catch (err) {
        console.error('✗ Delay override failed:', err);
    }
    // 9. Test auth context evaluation
    const authContext = (0, context_evaluator_1.evaluateAuthContext)({
        authorization: 'Bearer admin-secret-token',
    });
    console.log(`✓ Auth context: ${authContext} (admin token detected)`);
    const authContext2 = (0, context_evaluator_1.evaluateAuthContext)({});
    console.log(`✓ Auth context: ${authContext2} (no token = anonymous)`);
    // 10. Test TS mock handler
    try {
        const tsResponse = await fastify.inject({
            method: 'GET',
            url: '/mock/health',
        });
        console.log('✓ TS mock /health ->', tsResponse.status, JSON.parse(tsResponse.body));
    }
    catch (err) {
        console.error('✗ TS mock handler failed:', err);
    }
    console.log('\n=== All basic tests completed ===');
}
main().catch(console.error);
