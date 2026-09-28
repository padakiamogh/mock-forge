/**
 * mock-forge - Server Module
 * Fastify-based API mock engine with plugin system
 */
/* eslint-disable */
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { FastifyServerOptions } from 'fastify'
import { MockForgeConfig, MockResponse } from '../types'
import { createOpenAPIMocks, createTSMockHandler } from '../mocks/mock-generator'
export { createOpenAPIMocks, createTSMockHandler }
import { initStateDB } from '../state/state-manager'

/** Register mock route plugins */
async function registerMockRoutes(fastify: FastifyInstance, options: any): Promise<void> {
  const { mocks } = options

  if (!mocks) {
    fastify.log.warn('No mock definitions provided')
    return
  }

  // Handle OpenAPI-based mocks
  if (mocks.openapi) {
    const handlers = createOpenAPIMocks(mocks.openapi, options)
    registerOpenAPIHandlers(fastify, handlers)
  }

  // Handle TypeScript-based mocks
  if (mocks.typescript) {
    for (const mockDef of mocks.typescript) {
      const handler = createTSMockHandler(mockDef)
      const path = mockDef.path.replace(/^\//, '')
      fastify.route({
        method: mockDef.method,
        url: `/${path}`,
        handler: async (request: FastifyRequest, reply: FastifyReply) => {
          try {
            // Use as any to bypass Fastify type restrictions on path/queryString
            const req = request as any
            const response = await handler(
              req.path,
              req.method,
              req.queryString,
              req.headers,
              req.body
            )
            // Apply delay if specified
            if (response.delay) {
              await new Promise(resolve => setTimeout(resolve, response.delay))
            }
            reply.code(response.status).send(response.body)
          } catch (err) {
            fastify.log.error(err, 'Mock handler error')
            reply.code(500).send({ error: 'Mock handler failed' })
          }
        },
      })
    }
  }
}

/** Register OpenAPI handler routes */
function registerOpenAPIHandlers(
  fastify: FastifyInstance,
  handlers: Map<string, (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse>>
): void {
  for (const [key, handler] of handlers) {
    const [path, method] = key.split('+')

    fastify.route({
      method: method as any,
      url: `/${path}`,
      handler: async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          // Use as any to bypass Fastify type restrictions
          const req = request as any
          const response = await handler(
            req.path,
            req.method,
            req.queryString,
            req.headers,
            req.body
          )
          // Apply delay if specified
          if (response.delay) {
            await new Promise(resolve => setTimeout(resolve, response.delay))
          }
          reply.code(response.status).send(response.body)
        } catch (err) {
          const req = request as any
          fastify.log.error(err, 'Mock handler error', { path: req.path, method: req.method })
          reply.code(500).send({ error: 'Mock handler failed' })
        }
      },
    })
  }
}

/** Create and configure the Fastify server */
export async function createMockForgeServer(
  config: MockForgeConfig = {}
): Promise<FastifyInstance> {
  // Build fastify options, only passing known Fastify options
  const fastifyOptions: FastifyServerOptions = {
    logger: {
      level: config.loggerLevel || 'info',
    },
  }

  const fastify = Fastify(fastifyOptions)

  // Initialize state database (in-memory by default)
  initStateDB()

  // Register the mock routes plugin
  fastify.register(registerMockRoutes, {
    prefix: config.prefix || '/mock',
  })

  // Health check endpoint
  fastify.get('/health', async () => {
    return { status: 'ok', service: 'mock-forge' }
  })

  // SSE endpoint for real-time updates
  fastify.get('/sse', async (request, reply) => {
    // Use as any to bypass type restrictions
    const rep = reply as any
    rep.send({ type: 'connection', timestamp: Date.now() })
    // SSE setup - reply with appropriate headers
    rep.header('Content-Type', 'text/event-stream')
    rep.header('Cache-Control', 'no-cache')
    rep.header('Connection', 'keep-alive')
  })

  fastify.log.info('mock-forge server initialized')
  return fastify
}