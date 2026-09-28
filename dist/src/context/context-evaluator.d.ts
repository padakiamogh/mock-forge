/**
 * mock-forge - Context Evaluator Module
 * Evaluates request metadata, query overrides, auth headers, and override flags
 * @ts-nocheck
 */
import { MockContext, MockOverrides, MockResponse } from '../types';
/** Parse query string into key-value record */
export declare function parseQueryString(query: string): Record<string, string>;
/** Extract override flags from query parameters */
export declare function extractOverrides(query: string): MockOverrides;
/** Extract and enrich mock context from Fastify request */
export declare function createMockContext(requestPath: string, method: string, rawQuery: string, headers: Record<string, string>, body?: unknown): MockContext;
/** Evaluate whether to apply an override status code */
export declare function applyStatusOverride(response: MockResponse, overrides: MockOverrides): MockResponse;
/** Apply delay override if specified */
export declare function applyDelayOverride(response: MockResponse, overrides: MockOverrides): Promise<MockResponse>;
/** Simulate auth header evaluation (admin vs standard user) */
export declare function evaluateAuthContext(headers: Record<string, string>): 'admin' | 'standard' | 'anonymous';
/** Filter response body based on auth context */
export declare function filterBodyByAuth(body: unknown, authContext: 'admin' | 'standard' | 'anonymous'): unknown;
/** Full mock response pipeline */
export declare function processMockResponse(response: MockResponse, context: MockContext): Promise<MockResponse>;
export type { MockContext, MockOverrides };
