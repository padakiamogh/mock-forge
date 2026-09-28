/**
 * mock-forge - Mock Generator Module
 * Schema-based mocking (TypeScript/OpenAPI) with dynamic LLM fallback
 */
/* eslint-disable */
import { MockResponse, MockContext, MockForgeConfig } from '../types'
import { extractOverrides, parseQueryString, processMockResponse } from '../context/context-evaluator'
import { initStateDB, getSessionState, saveSessionState, logMutation, applyMutation } from '../state/state-manager'

/** Load OpenAPI specification and generate mock handlers */
export function createOpenAPIMocks(
  spec: string | Record<string, unknown>,
  config: MockForgeConfig = {}
): Map<string, (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse>> {
  const handlers = new Map<string, (...args: any[]) => Promise<MockResponse>>()

  // Parse spec if string
  const specObj = typeof spec === 'string' ? JSON.parse(spec) : spec

  if (!specObj.paths) {
    throw new Error('Invalid OpenAPI spec: missing paths')
  }

  for (const [path, pathItem] of Object.entries(specObj.paths as any)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      const op: any = operation
      const httpMethod = method.toUpperCase() as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

      if (httpMethod && op && op.responses) {
        handlers.set(`${path}+${httpMethod}`, createOpenAPIHandler(path, httpMethod, operation))
      }
    }
  }

  return handlers
}

/** Create a single OpenAPI-based mock handler */
function createOpenAPIHandler(
  path: string,
  method: string,
  operation: any
): (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse> {
  return async (requestPath, method, rawQuery, headers, body): Promise<MockResponse> => {
    const overrides = extractOverrides(rawQuery)

    // Start with default 200 response
    const defaultResponse: MockResponse = {
      status: overrides.status || 200,
      body: {},
    }

    // If there are defined responses for this status, use them
    if (operation.responses) {
      // Check for override status
      const effectiveStatus = overrides.status || 200
      if (operation.responses[effectiveStatus as number]) {
        const resp = operation.responses[effectiveStatus as number]
        defaultResponse.body = resp.body || {}
        defaultResponse.headers = resp.headers
      } else if (operation.responses['200']) {
        // Fallback to 200 response
        const resp = operation.responses['200']
        defaultResponse.body = resp.body || {}
        defaultResponse.headers = resp.headers
      }
    }

    // Context-aware processing
    const context: MockContext = {
      path: requestPath,
      method,
      query: parseQueryString(rawQuery),
      headers,
      body,
      session: {},
      overrides,
    }

    // Process through auth/filter pipeline
    const processed = await processMockResponse(defaultResponse, context)

    // State management for CRUD operations
    if (processed.status >= 200 && processed.status < 300 && body) {
      const sessionId = headers['x-session-id'] || 'default'
      initStateDB()

      // Log the mutation
      logMutation(sessionId, requestPath, method, body)

      // Apply to session state
      const state = getSessionState(sessionId)
      const updatedState = applyMutation(sessionId, requestPath, method, body) as any
      // Store state on context for future requests
      context.session = updatedState
    }

    return {
      status: processed.status,
      body: processed.body,
      delay: processed.delay,
    }
  }
}

/** Create TypeScript-based mock handler */
export function createTSMockHandler(
  mockDef: { path: string; method: string; handler: (ctx: MockContext) => MockResponse }
): (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse> {
  return async (requestPath, method, rawQuery, headers, body): Promise<MockResponse> => {
    const overrides = extractOverrides(rawQuery)

    const context: MockContext = {
      path: requestPath,
      method,
      query: parseQueryString(rawQuery),
      headers,
      body,
      session: {},
      overrides,
    }

    // Handle both sync and async handlers
    const result = mockDef.handler(context)

    // Handle both promise and sync return values
    const processed = result instanceof Promise ? await result : Promise.resolve(result)

    // State management
    if (processed.status >= 200 && processed.status < 300 && body) {
      const sessionId = headers['x-session-id'] || 'default'
      initStateDB()
      logMutation(sessionId, requestPath, method, body)
      const state = getSessionState(sessionId)
      applyMutation(sessionId, requestPath, method, body)
      context.session = state
    }

    return {
      status: processed.status,
      body: processed.body,
      delay: processed.delay,
    }
  }
}

/** Generate a dynamic LLM fallback response for unhandled payloads */
export async function generateLLMResponse(
  payload: unknown,
  config: MockForgeConfig
): Promise<MockResponse> {
  if (!config.llmFallback?.enabled) {
    return {
      status: 501,
      body: { error: 'LLM fallback not configured' },
    }
  }

  // TODO: Integrate with OpenCode API or other LLM service
  // For now, return a generic structured response
  return {
    status: 200,
    body: {
      note: 'LLM fallback triggered',
      payloadSummary: typeof payload === 'object' ? Object.keys(payload as Record<string, unknown>).slice(0, 5) : [String(payload)].slice(0, 5),
      generatedAt: new Date().toISOString(),
    },
  }
}