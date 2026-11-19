# Income Intelligence · operational pilot v0.1
19 November 2026 · Leiman Lab

## Product thesis

An evidence-first economic coordination system. Find demand, evaluate opportunity economics, match human and AI capabilities, execute with explicit authority, and record actual outcomes. The North Star is **net value delivered to participants**, never raw advertised dollar amounts or number of agent registrations.

## Routes

- `/en/income-desk`, `/income-desk`: bilingual operational user interface.
- `/en/opportunities`, `/opportunities`: source atlas, research methodology, early-access CV intake.
- `/en/organism`, `/organism`: clearly labeled synthetic process simulation.
- `/income-ops`: private operator queue, noindex, secured using existing `ADMIN_PASSWORD`.
- `/api/income/jobs?q=<query>&skills=<skills>&country=<ISO2>`: provider-backed remote job results with transparent fit, original attribution, and rate limiting.
- `POST /api/income/plan`: deterministic capability decomposition and illustrative budget split, no LLM.
- `POST /api/income/briefs`: consented, encrypted buyer brief; 30-day retention; one-time deletion token.
- `DELETE /api/income/briefs/:id`: request deletion with token.
- `GET /api/admin/income/briefs`: password-protected operator review queue.
- `POST /api/admin/income/briefs/:id`: password-protected progression status and operator-reported financial outcomes.
- `GET /api/admin/opportunities/submissions`: password-protected candidate CV queue.

## Provider and data terms

First actual remote job source: Himalayas (`https://himalayas.app/docs/remote-jobs-api`).
- Use documented `applicationLink` unchanged, link back to Himalayas visibly.
- Do not syndicate jobs, export them into third-party job boards, or publish JobPosting schema.
- Cache normal search queries; mark provider status and fetch date. Exclude expired and explicit no-open-role evergreen posts.
- Preserve restrictions; ambiguous locations are marked unknown and should not be treated as worldwide eligibility.
- Listings are external reports; acceptance by the company and availability are not independently guaranteed.
- External query contains search terms and optional country, **never CV or contact details**.
- Provider API data may lag by approximately 24 hours.

## Fit score

Rules-based heuristic, max 100. Skill overlap, job-title match, recency, salary disclosure and geographic eligibility. Score expresses relevance of available data, **never probability of hiring**. Geographic incompatibilities are filtered; unknown geographic requirements are surfaced. Missing salary lowers data completeness, not estimated earnings.

## Finance Curator v0.1

The planner is fully deterministic. Keyword-to-capability matching proposes humans and bounded AI support roles. The initial budget decomposition uses a fixed **76% execution, 10% QA and 14% coordination/contingency**. These are assumptions, not market estimates, not a binding bid, and **not a 14% profit forecast**. We do not know actual contribution margin until written scope, supplier quotes, taxes and contractual terms exist.

Operational status progression: unreviewed → qualified → contacted → proposal → contracted → delivered → paid (or declined). A human operator makes status updates. Reported net values are grouped by currency, retained only within the brief consent period, and not audited.

## Privacy & controls

- CV and buyer briefs are encrypted at rest with separate volume-held AES-256-GCM keys.
- Personal intake requires affirmative consent; optional CV outreach permission is stored separately.
- Private data are not sent to LLMs, job boards or automatic outreach systems.
- Self-service deletion tokens; expiration after 30 days. Status edits preserve the original record retention timestamp.
- Operator queue requires editor password; it is not embedded in any frontend code. Operator page is noindex, but authentication is the real boundary.
- Personal opportunity tracking is local browser storage with JSON export. Data do not automatically sync across devices.
- No escrow, autonomous contracting, proposal sending, disbursements, securities, equity transfers, subscriptions or external agent execution.

## Pilot milestones and evidence

1. Verify at least 100 unique provider-originated relevant opportunities; measure stale/evergreen rate and geographic eligibility.
2. Collect first consenting business briefs and independently verify buyers before any contact or proposal.
3. Deliver 5 real paid projects under separate contracts and track costs, receipts and hours.
4. Measure verified paid outcomes, response rates, cost of coordination, errors, customer disputes and exact source provenance.
5. Evaluate whether genuine matching and execution create enough margin to justify a Pro product or a coordination fee.

### Not implemented

Multi-provider grants and paid bounty ingestion, true automated source verification, cross-platform applicant identities, AI skill extraction, autonomous agents, invoicing/payment rails, escrow, DAO, equity, and paid subscription. None should be implied by a synthetic animation or hypothesis article.

## Verification

`npm run check` and `npm test` include syntax, bilingual HTML SEO, provider ingestion mocks, eligibility and expiry rules, consent and encrypted brief lifecycle, admin access, and deletion after human review. Production deploy tracked in Railway service `journal-web`.
