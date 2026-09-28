"use strict";
/**
 * mock-forge - State Engine Module
 * In-memory session state tracking with SQLite persistence
 */
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
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
/** SQLite database instance */
let db = null;
/** Initialize the state database */
function initStateDB(dbPath = ':memory:') {
    db = new better_sqlite3_1.default(dbPath, { verbose: console.log });
    // Create sessions table for persisting session state
    db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
    // Create mutation tracking table
    db.exec(`
    CREATE TABLE IF NOT EXISTS mutation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      path TEXT NOT NULL,
      method TEXT NOT NULL,
      body TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
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
    const relevantMutations = mutations.filter(m => {
        // Simple path matching - could be enhanced with regex
        return m.path === path;
    });
    const updatedState = { ...currentState };
    for (const mut of relevantMutations) {
        // Apply mutation logic based on method
        switch (mut.method.toUpperCase()) {
            case 'POST':
                // Create: add to records
                if (!updatedState.records[mut.path]) {
                    updatedState.records[mut.path] = [];
                }
                // Body was stored, add it
                ;
                updatedState.records[mut.path].push(mut.body);
                break;
            case 'PUT':
                // Update: replace existing or add
                if (updatedState.records[mut.path]) {
                    const index = updatedState.records[mut.path].findIndex((item) => item.id === mut.body?.id);
                    if (index >= 0) {
                        ;
                        updatedState.records[mut.path][index] = mut.body;
                    }
                    else {
                        ;
                        updatedState.records[mut.path].push(mut.body);
                    }
                }
                break;
            case 'DELETE':
                // Delete: remove from records
                if (updatedState.records[mut.path]) {
                    ;
                    updatedState.records[mut.path].filter((item) => item.id !== mut.body?.id);
                }
                break;
            default:
                break;
        }
    }
    // Save the updated state
    saveSessionState(sessionId, updatedState);
    return updatedState;
}
