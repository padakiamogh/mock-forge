/**
 * mock-forge - Type definitions for Real-Time Context-Aware API Mock Engine
 */

/** Base mock response configuration */
export interface MockResponse {
  status: number
  headers?: Record<string, string>
  body: unknown
  delay?: number /** milliseconds before responding */
}

/** OpenAPI-based mock definition */
export interface OpenAPIMock {
  path: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  schema: string /** OpenAPI path item operation object ref or full schema */
  responses: Record<number, MockResponse>
}

/** TypeScript-based mock definition */
export interface TSMock {
  path: string
  method: string
  handler: (context: MockContext) => Promise<MockResponse> | MockResponse
}

/** Context information for mock evaluation */
export interface MockContext {
  /** Request URL path */
  path: string
  /** Request method */
  method: string
  /** Request query parameters */
  query: Record<string, string>
  /** Request headers */
  headers: Record<string, string>
  /** Request body (parsed) */
  body?: unknown
  /** Session state references */
  session: Record<string, unknown>
  /** Arbitrary override flags */
  overrides: MockOverrides
}

/** Session state persisted across requests */
export interface SessionState {
  [key: string]: unknown
  /** Mutation tracking e.g., created IDs, updated records */
  records: Record<string, unknown[]>
}

/** Override flags for dynamic response modification */
export interface MockOverrides {
  /** e.g., ?mock_status=422 */
  status?: number
  /** e.g., ?mock_delay=1000 */
  delay?: number
  /** e.g., ?mock_error=true */
  error?: boolean
}

/** Convert MockOverrides to Record<string, string> for Fastify query access */
export function toRecord(overrides: MockOverrides): Record<string, string> {
  const record: Record<string, string> = {}
  if (overrides.status !== undefined) record.status = String(overrides.status)
  if (overrides.delay !== undefined) record.delay = String(overrides.delay)
  if (overrides.error !== undefined) record.error = overrides.error ? 'true' : 'false'
  return record
}

/** SSE event types */
export type SSEEvent = {
  type: 'state-update' | 'schema-reload' | 'mock-triggered'
  /** The path/route that triggered the event */
  route: string
  /** Payload data */
  payload: unknown
  /** Timestamp */
  timestamp: number
}

/** Mock engine configuration */
export interface MockForgeConfig {
  /** Base path for mock definitions */
  mocksPath?: string
  /** Whether to watch for file changes */
  watchFiles?: boolean
  /** Logger level */
  loggerLevel?: 'info' | 'warn' | 'error' | 'debug'
  /** API prefix for all mock routes */
  prefix?: string
  /** Mock definitions (OpenAPI and TypeScript) */
  mocks?: {
    openapi?: string | Record<string, unknown>
    typescript: Array<{ path: string; method: string; handler: (ctx: MockContext) => MockResponse }>
  }
  /** SSE configuration */
  sse?: {
    enabled: boolean
    prefix?: string
  }
  /** LLM fallback configuration */
  llmFallback?: {
    enabled: boolean
    model?: string
    apiKey?: string
  }
}