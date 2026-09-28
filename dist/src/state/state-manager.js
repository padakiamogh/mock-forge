"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initStateDB = initStateDB;
exports.getSessionState = getSessionState;
exports.saveSessionState = saveSessionState;
exports.logMutation = logMutation;
exports.getMutations = getMutations;
exports.applyMutation = applyMutation;
/**
 * mock-forge - State Engine Module
 * In-memory session state tracking with SQLite persistence
 */
/* eslint-disable */
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
/** SQLite database instance */
let db = null;
/** Initialize the state database */
function initStateDB(dbPath = ':memory:') {
    // @ts-ignore - better-sqlite3 type signature mismatch
    db = new better_sqlite3_1.default(dbPath);
}
/** Get session state by ID, returns default if not found */
function getSessionState(sessionId) {
    if (!db)
        initStateDB();
    const row = db.prepare('SELECT state FROM sessions WHERE session_id = ?').get(sessionId);
    if (row && row.state) {
        return JSON.parse(row.state);
    }
    // Return default state
    const defaultState = {
        records: {},
    };
    saveSessionState(sessionId, defaultState);
    return defaultState;
}
/** Save session state to database */
function saveSessionState(sessionId, state) {
    if (!db)
        initStateDB();
    const jsonState = JSON.stringify(state);
    const timestamp = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO sessions (session_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET state = ?, updated_at = ?`).run(sessionId, jsonState, timestamp, jsonState, timestamp);
}
/** Log a mutation (POST/PUT/DELETE) for state tracking */
function logMutation(sessionId, path, method, body) {
    if (!db)
        initStateDB();
    const jsonBody = body ? JSON.stringify(body) : null;
    const timestamp = Math.floor(Date.now() / 1000);
    db.prepare(`INSERT INTO mutation_log (session_id, path, method, body, created_at) VALUES (?, ?, ?, ?, ?)`).run(sessionId, path, method, jsonBody, timestamp);
}
/** Get all mutations for a session */
function getMutations(sessionId) {
    if (!db)
        initStateDB();
    return db.prepare('SELECT * FROM mutation_log WHERE session_id = ? ORDER BY created_at DESC').all(sessionId);
}
/** Incremental state update based on mutation */
function applyMutation(sessionId, path, method, currentState) {
    const mutations = getMutations(sessionId);
    // Find mutations affecting this path
    const relevantMutations = mutations.filter((m) => m.path === path);
    const updatedState = {
        records: { ...currentState.records },
    };
    for (const mut of relevantMutations) {
        switch (mut.method.toUpperCase()) {
            case 'POST':
                if (!updatedState.records[mut.path]) {
                    updatedState.records[mut.path] = [];
                }
                if (mut.body !== undefined) {
                    ;
                    updatedState.records[mut.path].push(mut.body);
                }
                break;
            case 'PUT':
                if (updatedState.records[mut.path]) {
                    const records = updatedState.records[mut.path];
                    const index = records.findIndex((item) => item.id === mut.body?.id);
                    if (index >= 0) {
                        ;
                        records[index] = mut.body;
                    }
                    else {
                        ;
                        records.push(mut.body);
                    }
                    updatedState.records[mut.path] = records;
                }
                break;
            case 'DELETE':
                if (updatedState.records[mut.path]) {
                    const records = updatedState.records[mut.path];
                    records.filter((item) => item.id !== mut.body?.id);
                    updatedState.records[mut.path] = records;
                }
                break;
            default:
                break;
        }
    }
    saveSessionState(sessionId, updatedState);
    return updatedState;
}
