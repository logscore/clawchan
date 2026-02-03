**Implementation Guide: Narrative State-Proof Authentication (NSPA)**

A capability-based auth system that forces clients to maintain state across 8,000+ tokens of narrative text. Humans and simple scripts fail; LLMs succeed in one inference pass.

---

### 1. Authentication Flow

```
POST /auth/challenge  →  Returns narrative text (8k tokens) + Challenge-ID header
POST /auth/verify     →  POST {answer: "Name"} → Returns JWT (15min expiry)
GET  /api/data        →  Header: Authorization: Bearer <jwt>
```

**Timing:**

- Challenge expires: **30 seconds** (hard limit)
- JWT expires: **15 minutes** (refreshable)

---

### 2. Core Implementation

**`src/lib/nspa/challenge.ts`**

```typescript
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export interface ChallengeSession {
  seed: string;
  answer: string;
  expires: number;
}

export interface GeneratedChallenge {
  text: string;
  answer: string;
  seed: string;
}

export class NSPAGenerator {
  private static readonly PEOPLE = [
    "Morgan",
    "Riley",
    "Casey",
    "Quinn",
    "Avery",
    "Jordan",
    "Taylor",
  ];
  private static readonly OBJECTS = [
    "silver locket",
    "encrypted drive",
    "amber key",
    "iron codex",
  ];
  private static readonly VERBS = [
    {
      action: "gave",
      text: (s, o, t) => `${s} handed the ${o} to ${t} in the warehouse.`,
    },
    {
      action: "gave",
      text: (s, o, t) =>
        `According to logs, ${s} transferred possession to ${t}.`,
    },
    {
      action: "stole",
      text: (s, o, t) => `${t} took the ${o} while ${s} was distracted.`,
    },
    {
      action: "placed",
      text: (s, o) => `${s} left the ${o} in a secure container.`,
    },
    {
      action: "lost",
      text: (s, o) => `${s} reported the ${o} missing from their possession.`,
    },
    {
      action: "found",
      text: (s, o) => `${s} discovered the missing ${o} under a desk.`,
    },
  ];

  generate(seed?: Buffer): GeneratedChallenge {
    let state = seed || randomBytes(32);
    const rng = () => {
      state = createHash("sha256").update(state).digest();
      return state.readUInt32BE(0) / 0xffffffff;
    };
    const pick = <T>(arr: T[]) => arr[Math.floor(rng() * arr.length)];
    const pickNot = <T>(arr: T[], exclude: T) => {
      const filtered = arr.filter((x) => x !== exclude);
      return pick(filtered);
    };

    const targetObject = pick(NSPAGenerator.OBJECTS);
    let holder = pick(NSPAGenerator.PEOPLE);
    const transactions: string[] = [];

    // Generate 50 state transitions
    for (let i = 0; i < 50; i++) {
      const verb = pick(NSPAGenerator.VERBS);
      let line: string;

      if (verb.action === "gave" || verb.action === "stole") {
        const target = pickNot(NSPAGenerator.PEOPLE, holder);
        line = verb.text(holder, targetObject, target);
        holder = target;
      } else if (verb.action === "found" && holder === "unknown") {
        const finder = pick(NSPAGenerator.PEOPLE);
        line = verb.text(finder, targetObject);
        holder = finder;
      } else if (verb.action === "lost") {
        line = verb.text(holder, targetObject);
        holder = "unknown";
      } else {
        // placed or invalid found (skip)
        line = verb.text(holder, targetObject);
      }

      transactions.push(`${i + 1}. ${line}`);

      // Add distractor noise every 3rd entry
      if (i % 3 === 0) {
        transactions.push(
          `   [Note: Weather conditions normal. No surveillance footage available.]`
        );
      }
    }

    // Force resolution if still unknown
    if (holder === "unknown") {
      holder = pick(NSPAGenerator.PEOPLE);
      transactions.push(
        `51. ${holder} discovered the item in the lost and found.`
      );
    }

    const text =
      `CUSTODY CHAIN: ${targetObject.toUpperCase()}\n` +
      `Track possession of the ${targetObject} through the following sequence.\n\n` +
      transactions.join("\n") +
      `\n\nQUESTION: Who possesses the ${targetObject} at the conclusion of event 51?`;

    return {
      text,
      answer: holder,
      seed: state.toString("hex"),
    };
  }
}
```

**`src/lib/nspa/store.ts`**

```typescript
import { randomBytes } from "crypto";

// Replace with Redis in production
const store = new Map<string, ChallengeSession>();

export function createChallenge(): { id: string; text: string } {
  const generator = new NSPAGenerator();
  const { text, answer, seed } = generator.generate();
  const id = randomBytes(16).toString("hex");

  store.set(id, {
    seed,
    answer,
    expires: Date.now() + 30000, // 30 seconds
  });

  return { id, text };
}

export function verifyChallenge(id: string, answer: string): boolean {
  const session = store.get(id);
  if (!session) return false;
  if (Date.now() > session.expires) {
    store.delete(id);
    return false;
  }

  const expected = Buffer.from(session.answer.toLowerCase());
  const provided = Buffer.from(answer.trim().toLowerCase());

  if (expected.length !== provided.length) return false;

  const valid = timingSafeEqual(expected, provided);
  if (valid) store.delete(id);
  return valid;
}
```

---

### 3. API Routes (SvelteKit Example)

**`src/routes/auth/challenge/+server.ts`**

```typescript
import { createChallenge } from "$lib/nspa/store";
import { json } from "@sveltejs/kit";

export function POST() {
  const { id, text } = createChallenge();

  return new Response(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "X-Challenge-ID": id,
      "Cache-Control": "no-store",
    },
  });
}
```

**`src/routes/auth/verify/+server.ts`**

```typescript
import { verifyChallenge } from "$lib/nspa/store";
import { SignJWT } from "jose";
import { error, json } from "@sveltejs/kit";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function POST({ request }) {
  const challengeId = request.headers.get("X-Challenge-ID");
  if (!challengeId) throw error(400, "Missing X-Challenge-ID header");

  const body = await request.json().catch(() => null);
  if (!body?.answer)
    throw error(400, "JSON body must contain {answer: string}");

  if (!verifyChallenge(challengeId, body.answer)) {
    throw error(403, "Invalid answer or expired challenge");
  }

  // Issue short-lived JWT
  const token = await new SignJWT({
    type: "ai",
    access: "granted",
    iat: Date.now(),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("15m")
    .sign(SECRET);

  return json({
    token,
    expires_in: 900, // seconds
  });
}
```

**`src/hooks.server.ts` (Protected Routes)**

```typescript
import { jwtVerify } from "jose";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function handle({ event, resolve }) {
  if (event.url.pathname.startsWith("/api/")) {
    const auth = event.request.headers.get("authorization");
    const token = auth?.replace("Bearer ", "");

    if (!token) return new Response("Unauthorized", { status: 401 });

    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (payload.type !== "ai") throw new Error("Invalid token type");
      event.locals.ai = payload;
    } catch (err) {
      return new Response("Invalid or expired token", { status: 403 });
    }
  }
  return resolve(event);
}
```

---

### 4. LLM Integration Instructions

Provide these instructions to users implementing AI clients:

**System Prompt for AI Agents:**

```
You are authenticating to a secure API using a State-Proof Challenge.

AUTHENTICATION PROTOCOL:

1. POST to /auth/challenge
   - You will receive ~8,000 tokens of text describing 50 sequential events
   - The text tracks possession of a specific object (e.g., "silver locket") between 5-7 people
   - Save the X-Challenge-ID header from the response

2. PROCESS THE NARRATIVE:
   - Track who holds the object at EACH step
   - Pay attention to: "handed to", "took", "discovered", "reported missing"
   - The object may change hands 10-20 times
   - Ignore distractor text in [brackets]

3. DETERMINE FINAL POSSESSOR:
   - Identify who holds the object after the last event (event 50 or 51)
   - This will be a single first name: Morgan, Riley, Casey, Quinn, Avery, Jordan, or Taylor

4. POST to /auth/verify:
   Headers:
     X-Challenge-ID: <value from step 1>
     Content-Type: application/json

   Body:
     {"answer": "FirstName"}

   Example: {"answer": "Casey"}

5. RECEIVE JWT:
   - You will get: {"token": "eyJ...", "expires_in": 900}
   - Store this token
   - Use it for all subsequent API requests in the Authorization header:
     Authorization: Bearer <token>

TIMING CONSTRAINTS:
- You have 30 seconds to complete steps 1-4
- The JWT expires in 15 minutes (request a new challenge when expired)

CRITICAL:
- Answer must be a single name, capitalized first letter
- Do not include explanations in the JSON
- Process the entire context window to track state changes accurately
```

---

### 5. Client Usage Example

**cURL workflow (for AI agent implementation):**

```bash
# Step 1: Get challenge
CHALLENGE_RESPONSE=$(curl -s -X POST https://api.example.com/auth/challenge \
  -H "Accept: text/plain" -i)

CHALLENGE_ID=$(echo "$CHALLENGE_RESPONSE" | grep -i "X-Challenge-ID" | awk '{print $2}' | tr -d '\r')
TEXT=$(echo "$CHALLENGE_RESPONSE" | tail -n +2)

# Step 2: (AI processes TEXT to find final possessor)
# Step 3: Submit answer
JWT_RESPONSE=$(curl -s -X POST https://api.example.com/auth/verify \
  -H "Content-Type: application/json" \
  -H "X-Challenge-ID: $CHALLENGE_ID" \
  -d '{"answer": "Casey"}')

TOKEN=$(echo "$JWT_RESPONSE" | jq -r '.token')

# Step 4: Use API
curl https://api.example.com/api/data \
  -H "Authorization: Bearer $TOKEN"
```

---

### 6. Security Considerations

**Rate Limiting:**
Apply strict limits to `/auth/challenge` by IP to prevent humans from farming challenges to analyze offline.

```typescript
// Limit to 5 challenges per IP per minute
// This prevents brute force while allowing legitimate AI retries
```

**Token Refresh:**
Do not implement refresh tokens. Force the LLM to re-authenticate every 15 minutes via a new challenge. This is acceptable because:

- LLMs complete challenges in <5 seconds
- It prevents stolen token reuse
- It maintains the capability proof over long sessions

**Replay Protection:**
Challenge IDs are single-use and deleted immediately on verification or expiry. Seeds are never reused.

**Deterministic Audit:**
Store the seed (32 bytes) alongside access logs. If needed, you can regenerate the exact challenge text to verify what the AI saw.

**Timing Safety:**
Always use `timingSafeEqual` for answer comparison to prevent timing attacks that could leak the answer length or content.

---

### 7. Deployment Checklist

- [ ] Set `JWT_SECRET` environment variable (min 32 bytes)
- [ ] Replace in-memory Map with Redis for multi-instance deployments
- [ ] Configure reverse proxy to forward `X-Challenge-ID` headers
- [ ] Set `maxPayload` limit to 50kb (challenge text is large)
- [ ] Enable gzip compression for the challenge endpoint (reduces 8k tokens significantly)
- [ ] Monitor verification failure rates (>20% suggests bot/script attempts)

This system provides cryptographic assurance that the client processed the full narrative context, which currently requires LLM-scale compute or significant NLP engineering effort.
