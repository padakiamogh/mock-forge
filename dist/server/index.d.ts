/**
 * mock-forge - Server Module
 * Fastify-based API mock engine with plugin system
 */
import type { FastifyInstance } from 'fastify';
import { MockForgeConfig } from '../types';
/** Create and configure the Fastify server */
export declare function createMockForgeServer(config?: MockForgeConfig): Promise<FastifyInstance>;
export type { MockForgeConfig };
