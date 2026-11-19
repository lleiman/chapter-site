# Income Intelligence v0.2 — Opportunity Engine
Deployment target: `leimanlab.com/en/income-desk#opportunity-engine` and `/income-desk#opportunity-engine`
Implemented 19 November 2026.

## Delivered

**Unified persistent index.** Himalayas employment, Grants.gov grant notices, and UK Find a Tender procurement releases are normalised into one non-personal schema with source, source-specific ID, official URL, classification, issuer, jurisdiction, reported availability, deadline, and type-specific monetary fields. Records persist to Railway `DATA_DIR/income-intelligence/opportunities-v2.json`, survive restarts, and are not sourced from private CV/brief records. On-demand feed searches enter the index; a bounded 6-hour seed refresh adds a limited range of source records. The index retains up to 5,500 records within a 90-day observation horizon but hides those not re-observed in 14 days by default. Expired deadline items are hidden by default. It is not an exhaustive market index: underlying provider windows, keyword samples and quotas still constrain coverage.

**Country and eligibility checks.** The public index searches without collecting profiles. Applicant attributes are sent only in a separate `POST /api/income/assess` request and are not persisted. Explicit country restrictions can trigger `ineligible` for employment. A matching country is *not* enough to assert legal eligibility. Every other inconclusive case returns `needs_review` with specific evidence gaps. Grants and tenders require the original programme or procurement notice before determination. The keyword-based capability check is labelled as such, not semantic skill inference.

**Separate economic memory.** Operator-only structured observations via `/income-ops` and authenticated `/api/admin/income/memory`. Allowed categories, outcomes, period, work hours, currency, receipts and direct costs. No identity field or free text. Operators affirm that submissions are non-personal, lawful to retain, and unlinked to applicants or projects. Data are stored separately on the Railway volume. The editor can delete records. Metrics never combine currencies and exclude overhead, taxes, acquisition costs and financing. Observations are **operator-reported, not independently audited**, and should not be represented as verified financial statements. Private CVs and briefs continue to expire after 30 days and are never silently imported into durable memory.

**Security and scope.** The index is public and source-attributed. The financial observation endpoints are admin-password protected. Both browser tools work in EN/RU. No outreach, binding contracts, exclusivity claims, money movement, equity or autonomous execution is enabled.

## API contracts

- `GET /api/income/index?q=&type=&country=&source=&limit=`: search non-personal indexed provider records, with per-type provenance and current observation time.
- `POST /api/income/assess` JSON `{id,profile:{applicantType,residenceCountry,registrationCountry,skills}}`: private, request-only rules and evidence gaps.
- `GET /api/admin/income/memory`: protected operator list and summaries.
- `POST /api/admin/income/memory` JSON structured economic observation with `nonPersonalConfirmation:true`.
- `DELETE /api/admin/income/memory/:uuid`: permanently delete that observation.

## Remaining material gaps (not to misrepresent)

1. **Index completeness**: UK feed samples up to 100 recent tender releases and no complete historical pagination; U.S. grants and employment use bounded keyword searches. Need full paginated, cursor-based official source indexes with checkpoints and amendment tracking.
2. **Notice requirements**: eligibility only checks explicit coarse country restrictions; no full official eligibility-document parsing or verified applicant qualification. Do not equate the source catalogue with access.
3. **Financial modelling**: Finance Curator's 76/10/14 plan remains an illustration, not a forecast, audited estimate or supplier quotation.
4. **Agent coordination**: No actual procurement bids, contract negotiations, specialist assignment, agent execution, or payment processing.
5. **Privacy governance**: Separate operators, robust access control, access audit, legal retention policy and deployment backup/restore procedures require dedicated review prior to large-scale sensitive data collection.
6. **Outcome data quality**: Manual structured economic figures are unverified. Need reconciliation to permissioned source evidence and defensible non-personal aggregation criteria.
7. **Cross-platform account sync**: Saved personal job pipeline is still browser-local only.

## Proof and smoke tests

`npm run check` and `npm test` verify the unified index's persistence, source provenance and URL safety, country eligibility exclusion, zero-eligibility-by-default, grants/procurement source adapters, authenticated economics API, currency-separated results, explicit non-personal consent and deletion. Live API response and production deployment must also be verified independently after the last commit.

## Success criteria for v0.3

Persistent, observable source coverage >95% of indexed official source windows; independently reviewed eligibility decisions for a held-out sample; first real payable briefs processed to completion with signed agreements, actual delivery costs and receipts. No simulated profits counted as operating results.
