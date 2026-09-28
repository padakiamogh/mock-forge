/**
 * mock-forge - Mock Generator Module
 * Schema-based mocking (TypeScript/OpenAPI) with dynamic LLM fallback
 */
import { MockResponse, MockContext, MockForgeConfig } from '../types';
/** Load OpenAPI specification and generate mock handlers */
export declare function createOpenAPIMocks(spec: string | Record<string, unknown>, config?: MockForgeConfig): Map<string, (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse>>;
/** Create TypeScript-based mock handler */
export declare function createTSMockHandler(mockDef: {
    path: string;
    method: string;
    handler: (ctx: MockContext) => MockResponse;
}): (requestPath: string, method: string, rawQuery: string, headers: any, body?: any) => Promise<MockResponse>;
/** Generate a dynamic LLM fallback response for unhandled payloads */
export declare function generateLLMResponse(payload: unknown, config: MockForgeConfig): Promise<MockResponse>;
