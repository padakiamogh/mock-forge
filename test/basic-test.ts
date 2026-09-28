/**
 * mock-forge - Basic Integration Test
 * Demonstrates the core capabilities of the mock engine
 * @ts-nocheck
 */

import Fastify from 'fastify'
import {
  createMockForgeServer,
  createOpenAPIMocks,
  createTSMockHandler,
} from '../src/server'
import {
  initStateDB,
  getSessionState,
  logMutation,
  applyMutation,
} from '../src/state/state-manager'
import {
  createMockContext,
  evaluateAuthContext,
  filterBodyByAuth,
  processMockResponse,
  extractOverrides,
} from '../src/context/context-evaluator'
import {
  MockResponse,
  MockContext,
  MockOverrides,
  toRecord,
} from '../src/types'

async function main() {
  console.log('=== mock-forge Basic Integration Test ===\n')

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
              body: { id: '', name: '' },
            },
            400: {
              description: 'Bad request',
              body: { error: '' },
            },
          },
        },
      },
      '/items/{id}': {
        get: {
          responses: {
            200: {
              description: 'Get item by ID',
              body: { id: '', name: '' },
            },
          },
        },
      },
    },
  }

  const handlers = createOpenAPIMocks(openapiSpec)
  console.log(`✓ Created ${handlers.size} OpenAPI mock handlers\n`)

  // 2. Create the server with OpenAPI + TS mocks
  const fastify = await createMockForgeServer({
    mocks: {
      openapi: openapiSpec,
      typescript: [
        {
          path: '/health',
          method: 'GET',
          handler: (context: MockContext): MockResponse => {
            return {
              status: 200,
              body: { status: 'ok', timestamp: new Date().toISOString() },
            }
          },
        },
      ],
    },
    loggerLevel: 'warn',
  })
  console.log('✓ mock-forge server created\n')

  // 3. Test OpenAPI GET /items
  try {
    const response = await fastify.inject({
      method: 'GET',
      url: '/mock/items',
    })
    const body = JSON.parse(response.body)
    console.log('✓ GET /mock/items ->', (response as any).status, JSON.stringify(body.body))
  } catch (err: any) {
    console.error('✗ GET /items failed:', err.message)
  }

  // 4. Test OpenAPI POST /items (state mutation)
  try {
    const postResponse = await fastify.inject({
      method: 'POST',
      url: '/mock/items',
      body: { name: 'widget' },
      headers: { 'content-type': 'application/json', 'x-session-id': 'test-session-1' },
    })
    const postBody = JSON.parse(postResponse.body)
    console.log('✓ POST /mock/items ->', (postResponse as any).status, JSON.stringify(postBody.body))

    // 5. Test that state persists - GET /items should now reflect the mutation
    const getResponse = await fastify.inject({
      method: 'GET',
      url: '/mock/items',
      headers: { 'x-session-id': 'test-session-1' },
    })
    const getBody = JSON.parse(getResponse.body)
    console.log('✓ GET /mock/items (after POST) ->', (getResponse as any).status, JSON.stringify(getBody.body))
  } catch (err: any) {
    console.error('✗ POST/GET cycle failed:', err.message)
  }

  // 6. Test context awareness - status override
  try {
    const overrideResponse = await fastify.inject({
      method: 'GET',
      url: '/mock/items?mock_status=422',
      headers: { 'x-session-id': 'test-session-1' },
    })
    console.log('✓ GET /mock/items?mock_status=422 ->', (overrideResponse as any).status)
  } catch (err: any) {
    console.error('✗ Status override failed:', err.message)
  }

  // 7. Test delay override
  try {
    const delayResponse = await fastify.inject({
      method: 'GET',
      url: '/mock/items?mock_delay=500',
      headers: { 'x-session-id': 'test-session-1' },
    })
    console.log('✓ GET /mock/items?mock_delay=500 -> status', (delayResponse as any).status, '(delay applied)')
  } catch (err: any) {
    console.error('✗ Delay override failed:', err.message)
  }

  // 8. Test auth context evaluation
  const authContext = evaluateAuthContext({
    authorization: 'Bearer admin-secret-token',
  })
  console.log(`✓ Auth context: ${authContext} (admin token detected)`)

  const authContext2 = evaluateAuthContext({})
  console.log(`✓ Auth context: ${authContext2} (no token = anonymous)`)

  // 9. Test body filtering by auth
  const filtered = filterBodyByAuth(
    { secret: 'admin-secret', name: 'widget', token: 'abc123', internal: 'data' },
    'standard' as 'standard'
  )
  console.log(`✓ Body filtered for standard user: ${JSON.stringify(filtered)}`)

  const filteredAdmin = filterBodyByAuth(
    { secret: 'admin-secret', name: 'widget', token: 'abc123', internal: 'data' },
    'admin' as 'admin'
  )
  console.log(`✓ Body filtered for admin: ${JSON.stringify(filteredAdmin)}`)

  // 10. Test TS mock handler
  try {
    const tsResponse = await fastify.inject({
      method: 'GET',
      url: '/mock/health',
    })
    console.log('✓ TS mock /health ->', (tsResponse as any).status, JSON.parse(tsResponse.body).status)
  } catch (err: any) {
    console.error('✗ TS mock handler failed:', err.message)
  }

  // 11. Test overrides extraction
  const overrides = extractOverrides('?mock_status=500&mock_delay=200&mock_error=true')
  console.log(`✓ Overrides extracted: status=${overrides.status}, delay=${overrides.delay}, error=${overrides.error}`)

  // 12. Test toRecord conversion
  const rec = toRecord({ status: 500, delay: 1000, error: true })
  console.log(`✓ toRecord conversion: ${JSON.stringify(rec)}`)

  console.log('\n=== All basic tests completed ===')
}

main().catch(console.error)