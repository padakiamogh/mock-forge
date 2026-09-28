import type { SessionState } from '../types';
/** Initialize the state database */
export declare function initStateDB(dbPath?: string): void;
/** Get session state by ID, returns default if not found */
export declare function getSessionState(sessionId: string): SessionState;
/** Save session state to database */
export declare function saveSessionState(sessionId: string, state: SessionState): void;
/** Log a mutation (POST/PUT/DELETE) for state tracking */
export declare function logMutation(sessionId: string, path: string, method: string, body?: unknown): void;
/** Get all mutations for a session */
export declare function getMutations(sessionId: string): any[];
/** Incremental state update based on mutation */
export declare function applyMutation(sessionId: string, path: string, method: string, currentState: SessionState): SessionState;
