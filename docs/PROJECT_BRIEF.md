# Copperline — Project Brief

> **Status:** Draft v1 — Under Review
> **Author:** [Steven Wyatt]
> **Created:** 25 March 2026
> **Last Updated:** 27 March 2026

---

## 1. Why This Exists

### The Problem

There is no system in place to manage personal spending. Money comes in, money goes out, and there's no visibility into where it goes or whether spending aligns with financial goals.

This matters now because the immediate priority is paying off debt, followed by building savings. Without a clear picture of income vs. outgoings, and without category-level budgets, there's no reliable way to know how much can be directed toward debt repayment each month — or how much headroom exists.

### What Success Looks Like

- **Month-end clarity:** After importing a bank statement, within minutes you can see exactly where every pound went, how each category compared to its budget, and how much surplus (or deficit) existed.
- **Trend awareness:** After 3+ months of data, you can see whether spending in any category is creeping up, and whether overall financial health is improving.
- **Debt/savings tracking:** Clear visibility into progress toward paying off debt, and later, toward savings goals.
- **Confidence:** The ability to answer "can I afford this?" with data instead of guesswork.

---

## 2. Who It's For

**Primary user:** You — a single user managing personal finances on a local machine.

**Future consideration:** The app may eventually support a partner's account data alongside yours, giving a household-level view of finances. This is explicitly *not* in scope for v1 but should not be designed out — the data model should accommodate multiple accounts from the start.

**Longer-term possibility:** Friends and family may use it. This would require hosting and authentication, which are out of scope but worth keeping in mind at the architecture level.

---

## 3. What It Does (Features by Priority)

### Must Have (v1)

| Feature | Description |
|---|---|
| **Transaction import** | Upload a Lloyds CSV/Excel statement and parse it into the database. Handle duplicates gracefully (re-importing a month shouldn't create double entries). |
| **Category system** | Hierarchical categories (parent → child). Parents: broad groups like "Food & Drink", "Housing", "Transport". Children: specific like "Groceries", "Eating Out", "Council Tax". User can create, edit, and reorder categories from the frontend. |
| **Transaction categorisation** | Assign each transaction to a category. Support a mapping/rules system so that known merchants (e.g. "TESCO STORES") are auto-categorised on import, with manual override always available. |
| **Monthly budgets** | Set a budget amount per category (or per parent category). See actual vs. budget per month. |
| **Dashboard** | A single-screen overview of the current month: total income, total spend, budget vs. actual by category, and remaining balance. |
| **Transaction list** | Browse, search, and filter transactions. Edit categories. |

### Should Have (v2)

| Feature | Description |
|---|---|
| **Trends & comparison** | Compare spending by category across months. Spot patterns (e.g. "eating out has doubled since January"). |
| **Targets / goals** | Set a debt payoff target or savings goal with a target date. Track progress over time. |
| **Recurring transaction detection** | Identify regular payments (rent, subscriptions, salary) and flag them so they can be factored into forecasts. |
| **Better auto-categorisation** | Learn from manual corrections — if you recategorise "UBER *EATS" from "Transport" to "Food & Drink > Takeaway" once, it should remember. |

### Could Have (v3+)

| Feature | Description |
|---|---|
| **Multiple accounts** | Import from more than one bank account (e.g. joint account, partner's account). View combined or per-account. |
| **Household view** | See combined finances across accounts, with the ability to filter by person. |
| **Forecasting** | Based on recurring transactions and average variable spending, estimate end-of-month position. |
| **Export / reporting** | Generate monthly or yearly summaries as PDF or printable reports. |

---

## 4. Tech Stack

### Decisions Made

| Layer | Choice | Rationale |
|---|---|---|
| **Database** | SQL Server Express (2022) | Free tier. Already known from day job as a SQL Server DBA at Atrium. Zero ramp-up time on the data layer. T-SQL skills transfer directly. |
| **Backend / API** | Python + FastAPI | Modern, fast, excellent developer experience. Auto-generates interactive API docs (Swagger UI). Strong library ecosystem for CSV parsing, data manipulation. |
| **Frontend** | React | Steepest learning curve of the options, but strongest AI assistance support, largest ecosystem, and highest career value. This is the primary learning area of the project. |
| **Hosting** | Local machine | No hosting costs. The app runs on your own computer and is accessed via browser (localhost). |

### Key Technical Notes

- **SQL Server Express limitations:** 10GB database size limit, 1GB RAM limit, 4 cores max. For a personal budgeting app, none of these will ever be a constraint.
- **FastAPI** will expose a REST API that the React frontend consumes. This clean separation means the frontend and backend are independent — you could swap either without rewriting the other.
- **React** will be a Single Page Application (SPA). We'll use a build tool like Vite for fast development feedback. Styling approach TBD (see Open Questions).
- **The app runs as three processes locally:** SQL Server (already running if installed), the FastAPI server (Python), and the React dev server (Node.js). Eventually the React app gets "built" into static files and served by FastAPI directly.

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Your Browser                   │
│              (React SPA on localhost)             │
└────────────────────┬────────────────────────────┘
                     │ HTTP (REST API)
                     ▼
┌─────────────────────────────────────────────────┐
│               FastAPI (Python)                   │
│                                                  │
│  • Serves API endpoints                          │
│  • Handles CSV parsing & import logic            │
│  • Applies categorisation rules                  │
│  • Business logic (budget calculations, etc.)    │
└────────────────────┬────────────────────────────┘
                     │ pyodbc / SQLAlchemy
                     ▼
┌─────────────────────────────────────────────────┐
│           SQL Server Express (Local)             │
│                                                  │
│  • Transactions, categories, budgets             │
│  • Merchant → category mapping rules             │
│  • All persistent data                           │
└─────────────────────────────────────────────────┘
```

### Data Flow: Monthly Import

1. Export statement from Lloyds Online Banking (CSV or Excel).
2. Upload the file via the React frontend.
3. FastAPI receives the file, parses it, normalises column names.
4. Each transaction is checked against existing data to prevent duplicates.
5. Known merchants are auto-categorised using the mapping rules table.
6. Unrecognised merchants are flagged as "Uncategorised" for manual review.
7. Transactions are inserted into the database.
8. The dashboard updates to reflect the new data.

---

## 6. Data Model (High Level)

> *Detailed schema design will be a separate document. This section captures intent.*

### Core Tables

- **Accounts** — Even for v1 with one account, this table exists so the model supports multiple accounts later. Fields: account ID, name, bank, type (current/savings/credit).

- **Transactions** — One row per transaction from a bank statement. Fields: transaction ID, account ID, date, description (raw text from bank), amount, debit/credit flag, transaction type (the Lloyds codes like DD, FPO, DEB), category ID (FK), import batch ID, created/updated timestamps.

- **Categories** — Hierarchical. Fields: category ID, parent category ID (nullable — null means it's a top-level parent), name, display order, is_active flag.

- **Budgets** — Monthly budget per category. Fields: budget ID, category ID, year-month, amount. Could be set at parent or child level.

- **MerchantRules** — Maps merchant patterns to categories for auto-categorisation. Fields: rule ID, pattern (e.g. "TESCO%"), category ID, priority (in case of overlapping rules), is_active.

- **ImportBatches** — Tracks each file import for auditability. Fields: batch ID, filename, import date, row count, status.

### Design Principles

- **Amounts stored in pence (integer)** — Avoids floating-point rounding issues. £12.50 is stored as 1250. The frontend formats for display.
- **Soft deletes where appropriate** — Categories can be deactivated rather than deleted, so historical data remains valid.
- **UTC timestamps** — All dates in UTC. Display layer handles formatting.

---

## 7. The Categorisation Challenge

This is the most complex part of the app and deserves its own section.

### How Lloyds Descriptions Look

Bank transaction descriptions are messy. Examples:
- `TESCO STORES 2847 LONDON GB`
- `AMAZON.CO.UK*AB1CD2EF3 AMAZON.CO.UK`
- `UBER *EATS HELP.UBER.CO`
- `DD - SKY DIGITAL`
- `FPO - J SMITH RENT`

### The Strategy

**Layer 1 — Merchant Rules (automatic):**
A rules table with patterns (using SQL `LIKE` or regex). When a transaction is imported, the description is matched against rules in priority order. If a match is found, the category is assigned automatically.

Example rules:
| Pattern | Category |
|---|---|
| `TESCO%` | Food & Drink > Groceries |
| `UBER *EATS%` | Food & Drink > Takeaway |
| `AMAZON%` | Shopping > Online (default — can be manually overridden) |

**Layer 2 — Manual Assignment:**
Any transaction without a rule match, or where the auto-match is wrong, gets manually categorised in the frontend. The app should make this easy — ideally a dropdown or quick-select on the transaction list.

**Layer 3 — Learn from Corrections (v2):**
When a user manually categorises a transaction, the app could offer to create a new rule based on that merchant. "You categorised 'UBER *EATS HELP.UBER.CO' as Takeaway. Create a rule for future UBER *EATS transactions?" This turns manual work into automation over time.

### Known Pitfalls

- **Amazon is a nightmare.** A single merchant can span groceries, electronics, household, entertainment. There's no way to auto-categorise Amazon accurately without line-item data (which the bank statement doesn't have). Strategy: auto-assign to a default Amazon category and accept that some manual work is unavoidable.
- **Similar merchants, different categories.** "UBER" could be a taxi (Transport) or food (Eating Out via Uber Eats). The transaction description usually distinguishes these ("UBER *EATS" vs "UBER *TRIP"), but rules need to be specific enough.
- **Transfers between your own accounts** should be excluded from spending calculations. These aren't expenses — they're money moving from one pocket to another.

---

## 8. Phased Delivery Plan

The approach is: design properly, then build in phases that each deliver something usable. Each phase builds on the last.

### Phase 0 — Foundation (No visible app yet)

- [x] Set up the Git repository with this brief and a README.
- [x] Design and create the database schema (full T-SQL scripts).
- [x] Set up the Python project with FastAPI.
- [x] Set up the React project (Vite + React).
- [x] Confirm Lloyds export format — export a real statement and document the columns.

**Deliverable:** A working repo with empty but runnable frontend and backend, plus a populated database schema.

### Phase 1 — Import & Browse

- [ ] Build the CSV/Excel import endpoint (FastAPI).
- [ ] Build the transaction list page (React) — sortable, filterable.
- [ ] Build the category management page — add/edit/reorder categories.
- [ ] Build manual transaction categorisation (dropdown on each transaction row).
- [ ] Implement merchant rules and auto-categorisation on import.

**Deliverable:** You can upload a statement, see your transactions, and categorise them.

### Phase 2 — Budgeting & Dashboard

- [ ] Build the budget-setting page — set monthly amounts per category.
- [ ] Build the dashboard — income vs. spend, budget vs. actual by category.
- [ ] Add month navigation (view current month, previous months).
- [ ] Visual indicators: over budget (red), under budget (green), on track (amber).

**Deliverable:** A working budgeting app. This is the core product.

### Phase 3 — Trends & Goals

- [ ] Multi-month comparison charts (spending by category over time).
- [ ] Debt payoff / savings goal tracking.
- [ ] Recurring transaction detection and flagging.
- [ ] "Learn from corrections" auto-rule suggestion.

**Deliverable:** The app becomes genuinely insightful, not just a record.

### Phase 4+ — Expansion (Future)

- [ ] Multiple accounts.
- [ ] Household / partner view.
- [ ] Forecasting.
- [ ] Mobile-optimised responsive design.
- [ ] Hosting for sharing with others (if desired).

---

## 9. Risks & Pitfalls

| Risk | Impact | Mitigation |
|---|---|---|
| **Lloyds changes their export format** | Import breaks | Design the parser to be configurable, not hardcoded. Map columns by name, not position. |
| **Duplicate imports** | Double-counted spending | Implement deduplication on import using a composite key (date + amount + description). May need a hash-based approach if Lloyds doesn't provide unique transaction IDs. |
| **Scope creep** | Never ships | This brief defines phases. Stick to the current phase. New ideas go into a backlog, not into the current sprint. |
| **Frontend learning curve** | Frustration, stalling | Use AI assistance heavily. Build ugly-but-functional first, then improve styling. Don't try to learn React AND make it beautiful simultaneously. |
| **Categorisation accuracy** | Misleading budget data | Accept that some manual work is necessary. The rule system improves over time. Perfection is not required — "good enough to be useful" is the bar. |
| **Floating-point money bugs** | Incorrect totals | Store all amounts as integers (pence). Convert only at display time. |
| **Motivation drops after Phase 1** | Unfinished project | Phase 2 is where the payoff is. Keep Phase 1 lean and get to the dashboard fast. |

---

## 10. Open Questions

These need answers before or during development. They do not block starting Phase 0.

1. **Lloyds export format:** What columns does the CSV actually contain? (Will be answered by exporting a real statement.)
2. **Styling approach for React:** Options include plain CSS, Tailwind CSS, or a component library like Material UI or shadcn/ui. Decision can wait until Phase 1. Recommendation: Tailwind CSS — utility-first, no pre-built components to learn, works well with AI assistance.
3. **Python ↔ SQL Server connection:** pyodbc vs. SQLAlchemy. pyodbc is simpler and more familiar to a DBA (raw SQL). SQLAlchemy adds an ORM layer. Recommendation: start with pyodbc for direct T-SQL queries (leverages existing skills), consider SQLAlchemy later if the codebase grows.
4. **Authentication:** Not needed for v1 (local, single user). If the app ever goes multi-user, this becomes critical. Don't build it early, but don't make assumptions that prevent adding it later.
5. **What are the starter categories?** A sensible default list should be defined before Phase 1. Draft below.

---

## 11. Starter Category Structure (Draft)

> *This is a starting point. Categories are fully editable in the app.*

| Parent | Children |
|---|---|
| **Income** | Salary, Freelance/Side Income, Refunds, Other Income |
| **Housing** | Rent/Mortgage, Council Tax, Utilities (Gas/Electric), Water, Home Insurance, Maintenance/Repairs |
| **Food & Drink** | Groceries, Eating Out, Takeaway/Delivery, Coffee/Snacks |
| **Transport** | Fuel, Car Insurance, Car Maintenance, Public Transport, Parking, Taxi/Rideshare |
| **Bills & Subscriptions** | Mobile Phone, Internet/Broadband, TV Streaming, Music Streaming, Software/Apps, Gym |
| **Personal** | Clothing, Haircare/Grooming, Health/Medical, Prescriptions |
| **Lifestyle** | Entertainment, Hobbies, Gifts, Holidays/Travel |
| **Financial** | Debt Repayment, Savings, Bank Fees/Charges, Interest Paid |
| **Shopping** | Online (General), Household Items, Electronics |
| **Other** | Uncategorised, Cash Withdrawals, Account Transfers |

---

## 12. Working with AI on This Project

### Recommended Approach

- **Planning & design (now):** Use Claude in conversation. Discuss, challenge, refine. Upload documents for review.
- **Development (build phase):** Start a new Claude conversation for each distinct task. Paste the relevant section of this brief at the start so context is clear. Example: *"I'm building the transaction import endpoint. Here's the relevant section of my project brief: [paste]. Here's my Lloyds CSV column structure: [paste]. Help me build the FastAPI endpoint."*
- **In-repo coding:** Consider Claude Code (Anthropic's CLI tool) for working directly in your repo — it can read your files, run your code, and iterate. Excellent for the build phase.
- **Debugging & learning:** When stuck on a React concept, ask Claude to explain it in terms you understand (SQL analogies often work well — components are like views, state is like a variable you SELECT from, props are like parameters to a stored procedure).

### Tips for Getting the Best Help

- **Show real code and real errors.** Don't describe a problem — paste the code and the error message.
- **Upload your actual Lloyds CSV** (redact sensitive data like account numbers) so the parser can be built against real column names.
- **Ask "why" not just "how."** Understanding the reasoning helps you learn, not just copy-paste.
- **Challenge recommendations.** If something doesn't make sense, say so. The best outcomes come from discussion, not blind acceptance.

---

## Appendix A: Repository Structure (Proposed)

```
copperline/
├── docs/
│   ├── PROJECT_BRIEF.md          ← This document
│   ├── SCHEMA.md                 ← Detailed database design
│   ├── API.md                    ← API endpoint documentation
│   ├── DECISIONS.md              ← Architecture Decision Records
│   └── BACKLOG.md                ← Ideas and future features
├── database/
│   ├── migrations/               ← Versioned schema change scripts
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_categories.sql
│   └── seed/                     ← Sample/test data
├── backend/
│   ├── app/
│   │   ├── main.py               ← FastAPI entry point
│   │   ├── routers/              ← API route handlers
│   │   ├── services/             ← Business logic
│   │   ├── models/               ← Data models
│   │   └── db.py                 ← Database connection
│   ├── requirements.txt
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── components/           ← React components
│   │   ├── pages/                ← Page-level components
│   │   ├── services/             ← API client functions
│   │   └── App.jsx               ← Root component
│   ├── package.json
│   └── vite.config.js
├── .gitignore
└── README.md
```

---

*This is a living document. Update it as decisions are made and scope evolves.*
