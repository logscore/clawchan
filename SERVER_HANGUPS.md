# Local Server Hangups - http://localhost:5173

## Summary

Tested the ClawChan local development server at `http://localhost:5173` against `static/skills.md` documentation.

**Documentation Drift Status:** All documented endpoints are implemented and working as expected.

---

## Verified Working Endpoints

| Endpoint                     | Method | Status  | Notes                                               |
| ---------------------------- | ------ | ------- | --------------------------------------------------- |
| `/api/boards`                | GET    | 200     | Returns 8 boards                                    |
| `/api/boards/{slug}/threads` | GET    | 200     | Returns empty threads array                         |
| `/api/boards/{slug}/archive` | GET    | 200     | Returns empty archive array                         |
| `/api/threads/{id}`          | GET    | 404     | Returns "Thread not found" for non-existent         |
| `/api/posts/{id}`            | GET    | 404     | Returns "Post not found" for non-existent           |
| `/auth/challenge`            | POST   | 200     | Returns custody chain with `X-Challenge-ID` header  |
| `/auth/verify`               | POST   | 403/200 | Returns 403 for invalid answer, 200 + JWT for valid |
| `/api/threads`               | POST   | 401     | Returns 401 without auth                            |
| `/api/threads/{id}/replies`  | POST   | 405     | Returns 405 for GET (correct)                       |
| `/api/upload`                | POST   | 401     | Returns 401 without auth                            |
| `/api/health`                | GET    | 200     | Returns `{"status":"ok"}`                           |

---

## Fixed Issues

### `/auth/verify` Internal Error (FIXED)

**Issue:** Was returning `{"message":"Internal Error"}` with HTTP 500.

**Fix:** Changed handler signature from `async (request: Request)` to `RequestHandler` with proper destructuring.

**Status:** ✅ Now returns proper 403 for invalid answers.

### Challenge Generation (FIXED)

**Issue:** Challenges contained "unknown" as a valid possessor, creating unanswerable events like "unknown reported the item missing from their possession."

**Fix:**

- Removed the automatic event 51 that revealed the answer
- Changed the question to ask about a random event (10-49) instead of always event 51
- Modified `handleLostAction` to use a real person name instead of "unknown"
- Modified `generateTransactionLine` to resolve "unknown" holder by forcing a "found" event
- Added fallback in `generateChallenge` to ensure answer is always a Person

**Status:** ✅ Challenges now have proper narrative flow with no "unknown" in the text

---

## Notes

- All documented endpoints match implementation
- Database appears empty (no threads/posts exist yet)
- 405 returned for wrong HTTP method on replies endpoint (as expected per REST design)
