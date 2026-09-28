/**
 * mock-forge - State Engine Module
 * In-memory session state tracking with SQLite persistence
 */
/* eslint-disable */
import Database from 'better-sqlite3'
import type { SessionState } from '../types'

/** SQLite database instance */
let db: Database.Database | null = null

/** Initialize the state database */
export function initStateDB(dbPath: string = ':memory:'): void {
  // @ts-ignore - better-sqlite3 type signature mismatch
  db = new Database(dbPath)
}

/** Get session state by ID, returns default if not found */
export function getSessionState(sessionId: string): SessionState {
  if (!db) initStateDB()

  const row = db!.prepare('SELECT state FROM sessions WHERE session_id = ?').get(sessionId)
  if (row && row.state) {
    return JSON.parse(row.state)
  }

  // Return default state
  const defaultState: SessionState = {
    records: {},
  }
  saveSessionState(sessionId, defaultState)
  return defaultState
}

/** Save session state to database */
export function saveSessionState(sessionId: string, state: SessionState): void {
  if (!db) initStateDB()

  const jsonState = JSON.stringify(state)
  const timestamp = Math.floor(Date.now() / 1000)

  db!.prepare(
    `INSERT INTO sessions (session_id, state, updated_at) VALUES (?, ?, ?) ON CONFLICT(session_id) DO UPDATE SET state = ?, updated_at = ?`
  ).run(sessionId, jsonState, timestamp, jsonState, timestamp)
}

/** Log a mutation (POST/PUT/DELETE) for state tracking */
export function logMutation(
  sessionId: string,
  path: string,
  method: string,
  body?: unknown
): void {
  if (!db) initStateDB()

  const jsonBody = body ? JSON.stringify(body) : null
  const timestamp = Math.floor(Date.now() / 1000)

  db!.prepare(
    `INSERT INTO mutation_log (session_id, path, method, body, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(sessionId, path, method, jsonBody, timestamp)
}

/** Get all mutations for a session */
export function getMutations(sessionId: string) {
  if (!db) initStateDB()

  return db!.prepare(
    'SELECT * FROM mutation_log WHERE session_id = ? ORDER BY created_at DESC'
  ).all(sessionId)
}

/** Incremental state update based on mutation */
export function applyMutation(
  sessionId: string,
  path: string,
  method: string,
  currentState: SessionState
): SessionState {
  const mutations = getMutations(sessionId)

  // Find mutations affecting this path
  const relevantMutations = mutations.filter((m: any) => m.path === path)

  const updatedState: SessionState = {
    records: { ...currentState.records },
  }

  for (const mut of relevantMutations) {
    switch (mut.method.toUpperCase()) {
      case 'POST':
        if (!updatedState.records[mut.path]) {
          updatedState.records[mut.path] = []
        }
        if (mut.body !== undefined) {
          ;(updatedState.records[mut.path] as any[]).push(mut.body)
        }
        break

      case 'PUT':
        if (updatedState.records[mut.path]) {
          const records = updatedState.records[mut.path] as any[]
          const index = records.findIndex((item: any) => item.id === mut.body?.id)
          if (index >= 0) {
            ;(records as any[])[index] = mut.body
          } else {
            ;(records as any[]).push(mut.body)
          }
          updatedState.records[mut.path] = records
        }
        break

      case 'DELETE':
        if (updatedState.records[mut.path]) {
          const records = updatedState.records[mut.path] as any[]
          ;(records as any[]).filter((item: any) => item.id !== mut.body?.id)
          updatedState.records[mut.path] = records
        }
        break

      default:
        break
    }
  }

  saveSessionState(sessionId, updatedState)
  return updatedState
}