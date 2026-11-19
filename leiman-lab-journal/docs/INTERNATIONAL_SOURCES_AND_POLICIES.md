# Income Intelligence · international source policies
Research and product update: 19 November 2026.

## What has actually been integrated

1. Himalayas official public remote jobs API, jobs feed. Attribution and redirect to original application links. Search may have location restrictions and may contain stale/evergreen listings. We exclude explicit evergreen ads and expired notices where detectable.
2. Grants.gov, official public U.S. grant search API `https://api.grants.gov/v1/api/search2`. Filters for `oppStatuses: posted`, discards passed deadlines when present; links each result to `https://www.grants.gov/search-results-detail/<id>`. **Posted does not mean a foreign, individual, or for-profit applicant can apply.** Eligibility and registration must be checked on the primary notice.
3. UK Find a Tender, official public OCDS release API `https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages`. Bounded sample: last four days, maximum 100 tender-stage releases before local search. Filters known ended deadlines. Not exhaustive; includes only coarse 'active' status and must not imply verified bidding or supplier qualification.

## Official source directory, distinct from live listing feeds

16 sources spanning US, UK, EU, Canada, Australia, Singapore, Indonesia and international procurement. Every source is annotated with geography, opportunity type, official URL, terms/registration policy and integration state. Filter and read in both languages in Income Desk.

Source readiness is **not** applicant eligibility. Directories marked `directory` have links to the official site, not an automated indexed set of currently open opportunities.

Adzuna is explicitly NOT integrated: its terms require agreement for ongoing commercial analytics / lead generation. USAJOBS is also not active: API authentication is required.

## Jurisdiction and policy gates

- **United States federal grants**: funding notices specify individual vs institutional participation and whether foreign applicants may apply; organisational submissions typically require registration. Official: https://grants.gov/learn-grants/grant-eligibility
- **United States federal employment**: federal job listings often have citizenship or clearance requirements and API key requirement. Official: https://developer.usajobs.gov/guides/authentication
- **European Union**: individual Horizon/EU calls have consortium, nationality, establishment, funding and co-financing rules. TED notices concern procurement rather than grant funding; eligibility is at the tender level. Official: https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/home and https://docs.ted.europa.eu/api/latest/search.html
- **United Kingdom**: open contracting OCDS fields publish tender procedures and buyer requirements, but an 'active' notice does not guarantee international bidding rights. Official: https://www.gov.uk/government/publications/open-contracting
- **Singapore**: GeBIZ registration and Government Supplier Registration requirements can vary by notice; foreign companies may register under applicable conditions. Official: https://www.gebiz.gov.sg/cmw/content/getstart.html
- **Indonesia**: INAPROC/LKPP platforms govern procurement participation and supplier verification; no blanket permission for autonomous scraping or foreign application has been validated. Official: https://bantuan.inaproc.id/hc/id-id
- **Canada**: overseas suppliers may face non-resident registration requirements, notice-specific contract terms. Official: https://canadabuys.canada.ca/en/getting-started/preparing-sell-government/how-register-your-business
- **Australia**: grants often specify ABN, Australian operating presence and programme qualification. Official: https://business.gov.au/grants-and-programs/
- **International**: UNGM / World Bank supplier and procurement requirements are agency- or project-specific. A general procurement notice might not be a currently actionable bid.

## Required downstream changes

For future automated eligibility matching, collect only consented and relevant fields, e.g. applicant type (individual/company/research institution), country of registration, ability to participate in required jurisdiction, and high-level skills. Do not infer immigration, nationality or tax status from IP. Never turn 'unknown' into 'eligible'.

For each opportunity store `originalSource`, `checkedAt`, `kind`, `jurisdiction`, `eligibilityStatus` (eligible / ineligible / requires_review), `eligibilityEvidence`, `deadline`, and verification outcome. Live feeds should separately record sync errors, stale notices and provider quota limits.

No automatic outreach, contracting, payment or equity actions are activated. Financial scores remain hypotheses requiring verified transaction data.

## Official documentation reviewed

- https://himalayas.app/docs/remote-jobs-api
- https://www.grants.gov/api/api-guide
- https://grants.gov/learn-grants/grant-eligibility
- https://www.gov.uk/government/publications/open-contracting
- https://docs.ted.europa.eu/api/latest/search.html
- https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/support/apis
- https://developer.adzuna.com/docs/terms_of_service
- https://www.gebiz.gov.sg/cmw/content/getstart.html
- https://business.gov.au/grants-and-programs/
- https://canadabuys.canada.ca/en/getting-started/preparing-sell-government/how-register-your-business
