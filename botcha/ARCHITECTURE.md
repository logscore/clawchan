# Botcha Architecture Document

## Overview

Botcha is a TypeScript library for human verification through logic-based challenges. It generates complex ownership-transfer puzzles that are trivial for humans to solve but difficult for automated systems.

**Key Principles:**
- Zero-config by default, fully customizable when needed
- Pluggable storage adapters (Redis, PostgreSQL, SQLite, MySQL, or in-memory)
- Framework-agnostic core
- Lazy cleanup by default with optional background sweeper
- Clear separation between "batteries included" and "advanced" APIs

## Architecture

### 1. Challenge System (Extensible)

The challenge system uses an abstract base class that allows adding new challenge types later without breaking changes.

```typescript
abstract class Challenge<TConfig, TResult> {
  abstract generate(config?: TConfig): TResult;
  abstract getAnswer(result: TResult): string;
}
```

**Current Implementation:**
- `OwnershipChainChallenge` - Generates custody chain puzzles with 50+ transaction events

**Future Types (planned extensibility):**
- Spatial reasoning challenges
- Temporal logic puzzles
- Multi-step deduction problems

### 2. Storage Adapters (Pluggable)

All storage implements a common interface, allowing users to swap backends without changing business logic.

```typescript
interface StorageAdapter {
  get(id: string): Promise<Session | null>;
  set(id: string, session: Session): Promise<void>;
  delete(id: string): Promise<boolean>;
  cleanupExpired(): Promise<number>;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
}
```

**Available Adapters:**
- `MemoryStorage` - In-memory Map, zero dependencies, development/testing
- `RedisStorage` - Redis/ioredis, production caching layer
- `PostgresStorage` - PostgreSQL via `pg`, persistent storage
- `SQLiteStorage` - SQLite via `better-sqlite3`, embedded/local deployments
- `MySQLStorage` - MySQL via `mysql2`, traditional web hosting

### 3. Cleanup Strategy

**Lazy Cleanup (Default):**
- Expired sessions removed only when accessed
- Zero background overhead
- Perfect for low-to-medium traffic (< 1000 challenges/day)
- Simple, predictable resource usage

**Background Sweeper (Optional):**
- Periodic cleanup via configurable interval
- Proactive removal prevents storage bloat
- Recommended for high traffic (> 10k challenges/day)
- Configurable via `sweeperIntervalMs` option

**Hybrid Approach:**
```typescript
const botcha = new Botcha({
  sweeperIntervalMs: 60000, // Enable sweeper: cleanup every 60s
  // Omit for lazy-only cleanup
});
```

### 4. Public API Design

#### Batteries Included (Recommended)

```typescript
import { Botcha } from 'botcha';

const botcha = new Botcha();

// Create challenge
const { id, text } = await botcha.createChallenge();

// Verify answer
const isHuman = await botcha.verifyChallenge(id, 'Morgan');
```

#### Advanced API (Custom Flows)

For users with existing session management or custom storage needs:

```typescript
import { generateOwnershipChallenge } from 'botcha/challenges/ownership';

// Generate raw challenge (you handle storage)
const challenge = generateOwnershipChallenge({
  people: ['Alex', 'Jordan', 'Taylor'],
  transactionCount: 30
});

// challenge = { text, answer, seed }
// Store in your existing system, verify with your own logic
```

**Warning:** The advanced API requires implementing:
- Timing-safe answer comparison (prevent timing attacks)
- Secure session storage
- Proper expiration handling

### 5. Configuration

```typescript
interface BotchaConfig {
  // Challenge generation
  challengeType?: 'ownership';
  challengeConfig?: OwnershipConfig;
  
  // Storage (default: MemoryStorage)
  storage?: StorageAdapter;
  
  // Session management (default: 30000ms)
  expirationMs?: number;
  
  // Cleanup (default: lazy only)
  sweeperIntervalMs?: number;
  
  // Crypto (default: crypto.randomBytes)
  entropySource?: () => Uint8Array;
}

interface OwnershipConfig {
  people?: string[];              // Default: 7 gender-neutral names
  objects?: string[];             // Default: 4 mysterious objects
  transactionCount?: number;      // Default: 50 events
  questionEventMin?: number;      // Default: 10
  questionEventMax?: number;      // Default: 50
  enableDistractors?: boolean;    // Default: true
}
```

### 6. Error Handling

Structured error classes for clear error handling:

```typescript
BotchaError (base)
├── ChallengeNotFoundError
├── ChallengeExpiredError
├── InvalidAnswerError
├── StorageConnectionError
└── ConfigurationError
```

### 7. Security Considerations

1. **Timing-safe comparison:** All answer validation uses `timingSafeEqual` to prevent timing attacks
2. **Cryptographic RNG:** SHA-256 based deterministic RNG for reproducible challenges from seed
3. **Short-lived sessions:** 30-second default expiration prevents replay attacks
4. **Secure by default:** No plaintext answer exposure, no session enumeration

### 8. Package Structure

```
botcha/
├── src/
│   ├── index.ts              # Main exports
│   ├── types.ts              # Core shared types
│   ├── errors.ts             # Error classes
│   ├── crypto.ts             # SHA-256 RNG utilities
│   ├── botcha.ts             # Main Botcha class
│   ├── challenge/
│   │   ├── ownership/
│   │   │   ├── index.ts      # Public ownership API
│   │   │   ├── generator.ts  # Generation logic
│   │   │   └── types.ts      # Ownership types
│   │   └── index.ts          # Challenge exports
│   └── storage/
│       ├── index.ts          # Storage exports
│       ├── interface.ts      # StorageAdapter interface
│       ├── memory.ts         # In-memory implementation
│       ├── redis.ts          # Redis adapter
│       ├── postgres.ts       # PostgreSQL adapter
│       ├── sqlite.ts         # SQLite adapter
│       └── mysql.ts          # MySQL adapter
```

### 9. Dependencies

**Required:**
- `nanoid` - Short unique IDs for challenges
- Node.js `crypto` - Built-in, timing-safe operations

**Optional Peer Dependencies:**
- `ioredis` - For Redis adapter
- `pg` - For PostgreSQL adapter
- `better-sqlite3` - For SQLite adapter
- `mysql2` - For MySQL adapter

### 10. DX Inspiration (from better-auth)

1. **Clear initialization:** Simple constructor with sensible defaults
2. **Plugin pattern:** Storage adapters plug into core
3. **Framework agnostic:** Works with Express, Fastify, Hono, Next.js, or raw Node
4. **Type inference:** Config flows through entire API automatically
5. **Actionable errors:** Clear messages that tell users exactly what to fix
6. **Tree-shakeable:** Import only the adapters you need

## Implementation Notes

### Original Code Analysis

From `src/lib/nspa/challenge.ts`:
- Uses SHA-256 for deterministic RNG (state-based)
- Generates 50 transaction events
- Supports transfer (gave/stole) and single (placed/lost/found) verbs
- Creates distractor notes every 3rd event
- Answer is the holder at a random event (10-50)

From `src/lib/nspa/store.ts`:
- In-memory Map storage
- 30-second expiration
- Timing-safe answer comparison using `timingSafeEqual`
- Bug: `cldSession` should be `buildSession`

### Improvements in Library

1. Fix `buildSession` typo
2. Extract crypto utilities for reusability
3. Add configurable expiration
4. Add configurable transaction counts
5. Support custom people/objects lists
6. Add storage adapter abstraction
7. Add sweeper cleanup option
8. Use nanoid instead of hex for shorter IDs
9. Add comprehensive error handling
10. Full TypeScript type safety

## Database Schemas

### PostgreSQL/SQLite/MySQL

```sql
CREATE TABLE botcha_sessions (
  id VARCHAR(21) PRIMARY KEY,  -- nanoid length
  answer VARCHAR(255) NOT NULL,
  seed VARCHAR(255) NOT NULL,
  challenge_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_expires ON botcha_sessions(expires_at);
```

### Redis

Uses hash structure:
```
HSET botcha:session:<id> answer <answer> seed <seed> challenge_type <type> expires_at <timestamp>
```

With additional index for cleanup:
```
ZADD botcha:expiry <timestamp> <id>
```

## Usage Examples

### Express.js

```typescript
import express from 'express';
import { Botcha, RedisStorage } from 'botcha';

const app = express();
const botcha = new Botcha({
  storage: new RedisStorage({ url: process.env.REDIS_URL }),
  sweeperIntervalMs: 60000
});

app.post('/challenge', async (req, res) => {
  const { id, text } = await botcha.createChallenge();
  res.json({ id, text });
});

app.post('/verify', async (req, res) => {
  const { id, answer } = req.body;
  const isHuman = await botcha.verifyChallenge(id, answer);
  res.json({ isHuman });
});
```

### Next.js API Route

```typescript
import { Botcha } from 'botcha';

const botcha = new Botcha();

export async function POST(request: Request) {
  const { id, text } = await botcha.createChallenge();
  return Response.json({ id, text });
}
```

### Custom Storage Implementation

```typescript
import { StorageAdapter } from 'botcha/storage';

class DynamoDBStorage implements StorageAdapter {
  async get(id: string): Promise<Session | null> {
    // Your DynamoDB get logic
  }
  
  async set(id: string, session: Session): Promise<void> {
    // Your DynamoDB put logic
  }
  
  async delete(id: string): Promise<boolean> {
    // Your DynamoDB delete logic
  }
  
  async cleanupExpired(): Promise<number> {
    // Batch delete expired items
  }
}
```

## Future Considerations

1. **Additional Challenge Types:**
   - Spatial: "If A is north of B, and B is west of C..."
   - Temporal: Event ordering puzzles
   - Multi-step: Require solving multiple challenges

2. **Features:**
   - Rate limiting per IP/session
   - Challenge difficulty levels
   - Statistics/metrics collection
   - Admin dashboard for monitoring

3. **Optimizations:**
   - Challenge pre-generation for high-traffic scenarios
   - Connection pooling for SQL adapters
   - Redis clustering support
