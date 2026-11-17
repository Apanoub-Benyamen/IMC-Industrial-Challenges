# IMC Industrial Challenges Platform

[العربية](README_AR.md) · [GitHub setup guide](docs/GITHUB_AR.md)

Phase 1 web application for registering industrial establishments, reviewing factory needs and following their route from assessment to a documented outcome.

The application has an Arabic/English interface, a Node.js HTTP server and a persistent SQLite database. It runs without third-party npm dependencies.

Includes V8 status colors and icons. See [GitHub and Render setup](docs/HOSTING_AR.md) for source upload and a shared website URL.

## Run locally

Install Node.js 24 or newer, then open a terminal in the project directory:

```sh
node seed.mjs
npm start
```

Open http://localhost:3000. On Windows, `start_windows.bat` performs the same steps. Seeding a new local database creates synthetic review records; running the seed again preserves an existing database.

| Local account | Email | Password |
|---|---|---|
| Factory | factory@imc-demo.test | Factory@IMC2026! |
| IMC administration | admin@imc-demo.test | Admin@IMC2026! |

Sign-in fields start empty. These addresses are local test accounts, not real mailboxes.

## Included workflows

- Complete establishment registration: applicant, legal entity, plants, documents and authorization when needed.
- Governorate-dependent locations, industrial zones and custom sector/subsector entries.
- IMC approval, request review, detailed information requests and assignment to registered partners.
- Read-only factory submissions, focused administrative actions, correspondence, request files and project follow-up.
- Responses with up to five PDF/PNG/JPG attachments, linked to the exact information response.
- Actual registration states with dated decision and resubmission history.
- Draft-only trash, restoration and confirmed permanent deletion of drafts and their attachments.
- Tracked factory closure requests decided by IMC; submitted and completed records cannot be deleted.
- Signed-in support plus public visitor inquiries delivered to the administrative support inbox.
- Role-specific guides, bilingual navigation, Excel/CSV exports and Cairo-date filters.

Email/mobile ownership verification and activation messages remain deferred in the default local mode. Establishment approval is still required before submitting a challenge. Visitor inquiries are recorded for IMC staff; email/phone contact buttons let staff follow up, while internal support notes remain private.

University login, external project-management portals, live government registry checks, financing and direct Power BI connectivity are outside this implementation.

## Checks

```sh
npm run check
npm test
```

75 tests cover authentication, authorization, CSRF, company isolation, registration, document checks, review transitions, attachment transactions, visitor privacy, reversible deletion, migration compatibility and interface helpers. Tests use temporary databases.

## Data and upgrades

`data/` contains the SQLite database and private uploaded files after startup. It is excluded from Git and from source archives. Keep it when updating an existing installation.

`migrations.mjs` applies the additive V6/V7 upgrades automatically and idempotently. It preserves accounts, approval states, request history and file references. Back up the stopped application's data before upgrading. See [V7 update notes](docs/UPDATE_V7_AR.md) and [database notes](docs/DATABASE_AR.md).

## Sharing the project

The repository contains the runnable application source. GitHub Pages only serves static sites; it cannot run this Node.js/SQLite backend. Colleagues can clone the repository and run the application locally. A shared live URL requires a host that runs Node.js with persistent storage; this source delivery does not deploy the service.

- [Push instructions in Arabic](docs/GITHUB_AR.md)
- [Operations](docs/OPERATIONS_AR.md)
- [Security and operating limits](docs/SECURITY_AR.md)
- [Location sources](docs/LOCATIONS_SOURCES_AR.md)
- [Design decisions and sources](docs/RESEARCH_V6_AR.md)

Brand assets are included for the IMC project context. Their presence does not imply that a production government service has been launched.
