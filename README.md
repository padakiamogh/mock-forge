# mock-forge - Real-Time Context-Aware API Mock Engine

## Overview

**mock-forge** is a Real-Time Context-Aware API Mock Engine that eliminates backend dependencies during frontend/mobile development sprint cycles. It enables contract-driven development where frontend engineers can build complete UI flows, test edge cases, and validate components against strict API contracts in parallel with backend development.

## Core Features

### MVP Core
- **Schema-based mocking**: OpenAPI and TypeScript-based mock definitions
- **Dynamic LLM fallback**: OpenCode API integration for unhandled payloads
- **Stateful in-memory CRUD**: Session persistence across mock calls (POST creates, GET reflects, PUT/DELETE update)
- **Query overrides**: `?mock_status=422`, `?mock_delay=1000ms`, `?mock_error=true`
- **Auth context simulation**: Admin vs standard vs anonymous user role evaluation
- **Body filtering**: Auto-filter admin-only fields from standard user responses
- **Fastify-based server**: High-performance proxying with native plugin support

### Post-MVP Roadmap
- Browser dashboard for route inspection/overrides
- Headless CLI runner for CI/CD test suites
- GraphQL support
- File-system watchers (chokidar) for hot reload on schema changes

## Quick Start

```bash
# Install dependencies
npm install

# TypeScript compilation
npx tsc

# Run the integration test
npx tsx test/basic-test.ts
```

The server starts at `http://localhost:3000` by default (configured via Fastify).

## Module Structure

| Module | Purpose |
|--------|---------|
| `src/types/` | Type definitions for mock responses, context, state, overrides |
| `src/state/` | In-memory SQLite session state with mutation tracking |
| `src/context/` | Override flag extraction, auth evaluation, body filtering |
| `src/mocks/` | OpenAPI + TypeScript mock generator with LLM fallback |
| `src/server/` | Fastify server with plugin system, SSE, route registration |
| `src/utils/` | Helper functions |

## Core Capabilities

### Context-Aware Mocking
- `?mock_status=422` - Override HTTP status code
- `?mock_delay=1000` - Add delay in milliseconds
- `?mock_error=true` - Simulate error responses
- Session state persists across requests (mutation tracking)

### Role-Based Context
- **Admin**: Full access to all fields including secrets/internal data
- **Standard**: Admin-only fields filtered out (secrets, tokens, internal data)
- **Anonymous**: Minimal response body

### Schema-Based Mocking
- OpenAPI 3.0 spec support with path item/operation parsing
- TypeScript type-based mock definitions
- Dynamic response body generation from TypeScript types

## Development

```bash
# Compile TypeScript
npx tsc

# Run tests
npx tsx test/basic-test.ts

# Build for production
# (configured via Fastify logger/transport options)
```

## Design Philosophy

- **Zero backend dependency**: Mocks entirely replace backend services during development
- **Contract-driven**: API contracts defined once, used for both mocking and validation
- **Real-time aware**: SSE endpoints for state change notifications
- **Type-safe**: Full TypeScript support throughout the stack
- **Extendable**: Plugin system for adding new mock types and features