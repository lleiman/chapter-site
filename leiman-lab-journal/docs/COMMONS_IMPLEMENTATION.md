# Leiman Lab Commons · Implementation, security & DAO activation plan
Version 0.1 | 18 November 2026 | Pilot (not legally incorporated)

## What is implemented in this branch
- Public /commons page with constitution, two research programs, contributor directory, proposal assembly, advisory ballots, decision ledger, research evidence registry, 90-day metrics and staged DAO roadmap.
- Persistent, single-instance JSON state in DATA_DIR/commons/state.json with atomic writes and previous-state backup state.json.bak. Uses the existing Railway volume at /data; it never writes into tracked publication content.
- Steward moderation, invitation-only unique member keys, voluntary public profiles, member-submitted proposals and comments, one member-one-advisory-vote, role labels, immutable finalized decisions with reasons and turnout.
- No wallet, token, external service, private dataset collection, domain transfer, or legal equity assignment is activated.

## Routes
- GET /commons
- GET /api/commons: public summary, approved comments, proposal tallies, decision log, evidence and pilotMetrics.
- GET /api/commons/me (Bearer 64-hex member key): own profile and pending proposal statuses.
- POST /api/commons/profile: name, bio, displayPublic.
- POST /api/commons/proposals: program, title, summary. Moderated, not published on submission.
- POST /api/commons/comments: proposalId, text. Moderated.
- POST /api/commons/votes: proposalId, choice (yes/no/abstain). Change permitted until proposal closes.
- GET /api/admin/commons: X-Admin-Password; private moderation summary without any member secret.
- POST /api/admin/commons/members: name, role, displayPublic. Returns new unique member token once; only SHA-256 hash stored. Use secure one-to-one delivery.
- POST /api/admin/commons/revoke: memberId.
- POST /api/admin/commons/proposals: proposalId, status open/accepted/rejected/closed, mandatory rationale to finalize.
- POST /api/admin/commons/comments: commentId, status approved/rejected.
- POST /api/admin/commons/programs: programId, status design/recruiting/active/completed.
- POST /api/admin/commons/evidence: programId, kind, title and HTTPS url. A registered evidence item is **not independent scientific validation**.

## Authentication and privacy
Members receive unguessable 32-byte secrets; only token hashes are stored. Browser saves the member token in sessionStorage for the current tab session. Admin password stays in memory and is never placed into localStorage. Browser code doesn't include third-party trackers. The existing ADMIN_PASSWORD protects all admin routes. Arbitrary HTML is rejected in text fields and user content is escaped again in the browser. Public JSON hides secret hashes, pending content, names without consent and revoked members.

Security limits: This is an invitation-based prototype, not a mature identity system. A member can share a key and thereby impersonate that member; thus one-person-one-vote assumes trusted registration. There is no password reset, email verification, hardware MFA, rate limit on authenticated API writes, audit-log signing, independent backup storage, or external penetration test yet. Do not admit untrusted broad public membership until those controls exist. No personal research data should be uploaded to Commons.

## Pilot checkpoints
- Pilot starts November 18, 2026; formal 90-day review scheduled for February 16, 2027.
- Monthly review on approximately December 18 and January 18; final review February 16.
- Count regularly contributing researchers over a 30-day window, not mere registrations. Current API counts active invite keys, proposals, decisions, linked evidence, documented independent replications and completed programs, but cannot certify ongoing work from these numbers alone.
- For each result attach versioned protocol, reproducibility materials where lawful, actual named contribution according to CRediT, a technical validation record, conflicts of interest and explicit limitations. Treat registered evidence as a discovery index until reviewer sign-off.
- Start criterion for considering a separate entity: roughly 5–10 regularly active researchers, multiple completed joint works, documented independent review, clear finances and a consistent contribution ledger. These are provisional, non-binding thresholds.

## Equity and domain proposal: NOT activated
Separate governance powers from project-specific economic rights and scientific authorship. Keep leimanlab.com and existing Leiman Lab IP with their current legal owner. The Commons entity (if formed) may later hold shared rights in specific jointly created assets, following a signed contract. Do not retroactively apply a percentage formula to pre-existing content or brand.

For a future shared .eth domain:
1. Verify availability and trademark conflicts for an ENS candidate. Do not assume leimanlab.eth is free.
2. Establish legal entity and specify beneficial/contractual rights and transfer restrictions.
3. Generate a Safe multisig with independently controlled keys (example 3-of-5), physical backups, timelock/delays as appropriate, documented key-rotation and incident procedure.
4. Approve charter changes and budget changes through real authenticated participants (Snapshot can be considered), then require human Safe signatures for actual execution. Off-chain voting alone does not enforce transfers.
5. Register name to the designated controlled wallet only after signer verification; publish exact on-chain address, contract network, custody rights, renewal responsibility and annual budget.
6. Publish audited financial and domain events in Commons; keep DNS .com as canonical until there is a documented reason to change.

Avoid premature transferable governance tokens, token-based vote buying, equal rights promises without contracts, and mixing founder's named brand with collectively owned assets.

## Production acceptance
- Run npm run check and npm test on Node 20+.
- Confirm /commons, /assets/commons.css, /api/commons, /sitemap.xml and all existing article routes.
- Create two test members, proposal, moderation, changed ballot, approved comment, finalized decision, evidence URL; verify public JSON never returns token hashes or drafts.
- On Railway, confirm DATA_DIR points to the mounted /data volume; test a restart and whether the state persists.
- Recheck site navigation on 375px and 1440px; no content overlap in the header; keyboard focus and screen-reader labels.
- Review the charter legally before presenting it as binding governance. Back up existing volume first. Do not merge to live journal until CI is green.

## Key outstanding work
Legal incorporation, member identity verification, scientific reviewer workflow, contributor task tracking, evidence-level review, external backups, complete accessibility and penetration testing, legally enforceable revenue shares, Safe/ENS/Snapshot registration, member appointments and actual treasury funding remain future activities. None should be represented as completed by this code change.