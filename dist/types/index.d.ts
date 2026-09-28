/**
 * mock-forge - Type definitions for Real-Time Context-Aware API Mock Engine
 */
/** Base mock response configuration */
export interface MockResponse {
    status: number;
    headers?: Record<string, string>;
    body: unknown;
    delay?: number; /** milliseconds before responding */
}
/** OpenAPI-based mock definition */
export interface OpenAPIMock {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    schema: string; /** OpenAPI path item operation object ref or full schema */
    responses: Record<number, MockResponse>;
}
/** TypeScript-based mock definition */
export interface TSMock {
    path: string;
    method: string;
    handler: (context: MockContext) => Promise<MockResponse> | MockResponse;
}
/** Context information for mock evaluation */
export interface MockContext {
    /** Request URL path */
    path: string;
    /** Request method */
    method: string;
    /** Request query parameters */
    query: Record<string, string>;
    /** Request headers */
    headers: Record<string, string>;
    /** Request body (parsed) */
    body?: unknown;
    /** Session state references */
    session: Record<string, unknown>;
    /** Arbitrary override flags */
    overrides: Record<string, string>;
}
/** Session state persisted across requests */
export interface SessionState {
    [key: string]: unknown;
    /** Mutation tracking e.g., created IDs, updated records */
    records: Record<string, unknown[]>;
}
/** Override flags for dynamic response modification */
export interface MockOverrides {
    /** e.g., ?mock_status=422 */
    status?: number;
    /** e.g., ?mock_delay=1000 */
    delay?: number;
    /** e.g., ?mock_error=true */
    error?: boolean;
}
/** SSE event types */
export type SSEEvent = {
    type: 'state-update' | 'schema-reload' | 'mock-triggered';
    /** The path/route that triggered the event */
    route: string;
    /** Payload data */
    payload: unknown;
    /** Timestamp */
    timestamp: number;
};
/** Mock engine configuration */
export interface MockForgeConfig {
    /** Base path for mock definitions */
    mocksPath?: string;
    /** Whether to watch for file changes */
    watchFiles?: boolean;
    /** SSE configuration */
    sse?: {
        enabled: boolean;
        prefix?: string;
    };
    /** LLM fallback configuration */
    llmFallback?: {
        enabled: boolean;
        model?: string;
        apiKey?: string;
    };
}
