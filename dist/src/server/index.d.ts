/**
 * mock-forge - Server Module
 * Fastify-based API mock engine with plugin system
 */
import { FastifyInstance } from 'fastify';
import { MockForgeConfig } from '../types';
import { createOpenAPIMocks, createTSMockHandler } from '../mocks/mock-generator';
export { createOpenAPIMocks, createTSMockHandler };
/** Create and configure the Fastify server */
export declare function createMockForgeServer(config?: MockForgeConfig): Promise<FastifyInstance>;
