# Planora AI — Founder Strategy Memo (v1)

*Prepared as your co-founder / CPO / CSO, grounded in a full read of the repository. Stage assumed: solo founder, pre-customer. Everything below is optimized for one thing — getting you to your first design partner and first dollar, then to a fundable company.*

---

## 0. The honest situation in one paragraph

You have exceptional supply-chain domain fidelity encoded into a broad, polished demo: 16 modules, 82 API endpoints, and a *real* forecasting engine (11 statistical models plus sklearn/XGBoost/LightGBM/AutoML). That domain insight — the part most founders can't fake — is your genuine edge. But the product is architecturally a **single-tenant prototype**: no `tenant_id` anywhere in the data model, RBAC lives in the frontend, the "AI Copilot" is a bring-your-own-key passthrough to third-party LLMs, and the ERP/WMS/TMS/procurement connectors and many metrics are explicitly simulated (`hash(sku) % 100`, `np.random`). The README claims all 16 modules are "Strong"; the code says you have one real engine wrapped in fifteen convincing storefronts. **None of that is a criticism of where you are — it's exactly right for a demo. The strategic error would be to keep adding storefronts instead of turning one of them into something a company will pay for.** This memo is about choosing that one.

---

## PART 1 — Ruthless Product Focus

### 1.1 The core principle for your stage

At pre-customer, breadth is a liability. Sixteen modules tells an investor "unfocused" and tells a buyer "shallow everywhere." You cannot out-breadth Kinaxis, o9, or Blue Yonder — they have 1,000+ engineers and 20-year head starts. You win by going **deeper than they bother to, in one workflow, for a customer they ignore.** So the tiering below is not "what's impressive" — it's "what earns the right to exist in your first sellable version."

### 1.2 Module tiering

**PRIMARY — the reason a customer buys (your entire focus for the next 6 months)**

| Module | Why it's Primary |
|---|---|
| **Demand Planning** (forecasting, consensus editor, overrides, FVA) | Your home turf as an ex-planner, the one place you have *real* ML depth, and the workflow every planning team touches weekly. This is your credibility wedge. |
| **Inventory Optimization** (safety stock, ROP/EOQ, ABC/XYZ, multi-echelon, working capital) | This is where the **money** is. Better forecasts are abstract; freed cash and avoided stockouts are CFO-legible. Inventory is the ROI proof that makes forecasting worth paying for. |

These two are one coupled value loop: *forecast accuracy → inventory the business can feel in cash and service level.* That loop is your product. Everything else supports it or waits.

**SECONDARY — deepens retention and expands account value (build once Primary has a paying user)**

| Module | Why it's Secondary |
|---|---|
| **S&OP / IBP** | Turns a planner tool into an org-wide *process* platform — the thing that makes you sticky and un-rip-out-able. But nobody buys S&OP software before their forecasts are trusted. It's an expansion motion, not a wedge. |
| **Executive Analytics / Control Tower** | Gives your exec sponsor the visibility that drives *renewal*. Retention feature, not acquisition feature. |
| **AI Copilot / Decision Intelligence** | Real differentiator *potential*, but today it's a UI wrapper with no moat. Keep it as a bundled delighter, not a headline. (More on turning this into a moat in Part 3.) |

**TERTIARY — platform breadth and maturity (great demo, wrong quarter — mostly V2/V3)**

Pricing & Promotion, Retail & Assortment, Supplier Collaboration/Portal, Digital Twin & Scenario Simulation, Self-Service BI, Financial Planning, Warehouse Intelligence, Workforce Planning, Execution/Connectors. Each is a legitimate future business. Each also dilutes focus, adds maintenance surface, and — critically — most are currently simulated, so they're demo liabilities the moment a technical buyer probes them. **Recommendation: freeze all Tertiary modules. Don't delete them (they're great for demos and vision-selling), but stop investing engineering time until Primary is real and sold.**

### 1.3 A separate, non-negotiable category: Platform Foundation

This is not a "module" — it's the floor you cannot sell without. Today it's missing, and it's your #1 blocker to revenue:

- **Multi-tenancy** — add `organization_id` to every table with row-level isolation. You cannot safely onboard two customers today.
- **Server-side auth + RBAC** — move authentication and permissions out of the frontend; hash passwords; real JWT issuance server-side.
- **One real integration** — pick a *single* real data path (CSV/Excel upload is fine to start; then one real connector, likely a flat-file/SFTP or a NetSuite/QuickBooks-tier API — not SAP) and make it genuinely work.
- **Data security basics** — tenant data encryption, audit logging that's real (you have the model), and a defensible data-handling story for buyer security reviews.

Until this exists, you have a demo, not a product. This is where your next engineering month goes.

### 1.4 The beachhead workflow (the single most important decision in this memo)

> **Lead with forecasting credibility. Sell on inventory/working-capital outcome. Land in the mid-market.**

Concretely, your first sellable product is: *"Upload your sales history, get materially better demand forecasts than your spreadsheets, and see exactly how much trapped working capital and how many stockouts that removes — with a planner-friendly consensus workflow on top."*

Why this wedge:
- **It's the pain you personally lived** as a demand planner — you can sell it in the buyer's own language, which is a solo founder's single biggest advantage.
- **The ROI is quantifiable and cash-denominated** ("$X freed, Y% fewer stockouts"), which is how you get a mid-market ops or finance leader to sign.
- **The incumbents ignore this buyer.** o9/Kinaxis/Blue Yonder deployments run 6–18 months and cost six-to-seven figures. A $100M–$500M-revenue manufacturer or distributor drowning in Excel is un-servable by them and is your ideal first customer.

The assumption to validate with real buyers in the next 30 days: *is forecast-accuracy-into-inventory the pain they'll pay to remove first, or is it pure inventory/replenishment?* Ten customer conversations settle this. Don't build further until they do.

---

## PART 2 — Path to First Revenue

### 2.1 Ideal Customer Profile (first 5 design partners)

- **Company size:** $50M–$500M revenue. Big enough to feel inventory pain in real dollars, too small for o9/Kinaxis to serve.
- **Industry:** Discrete manufacturing, wholesale/distribution, or a mid-market consumer brand — physical goods, real SKUs, real inventory carrying cost. Avoid pure retail/grocery first (planogram/assortment complexity is Tertiary).
- **Current state:** Planning in Excel, or on a legacy tool they hate (older SAP APO/IBP, Netstock, a homegrown thing). "We have a demand planner and a mess of spreadsheets" is the perfect signal.
- **Economic buyer:** VP Supply Chain / VP Ops / COO. Champion: the demand/supply planner (your peer — sell through them).
- **Disqualifiers:** Companies wanting deep multi-echelon retail, or a full ERP replacement, or anyone who says "can it also do pricing and workforce and…" — that's the breadth trap on the buy side.

### 2.2 The design-partner motion (not a sales motion yet)

You're pre-customer and solo. You don't need pricing pages or a sales team — you need **3–5 design partners** who give you real data, real feedback, and a logo, in exchange for a steep discount or free pilot. The sequence:

1. **20 discovery calls** with planners/ops leaders in your ICP (LinkedIn, your ex-colleagues, supply-chain communities). Goal: confirm the beachhead pain and hear their words. No pitching.
2. **Convert 3–5 into design partners** on a free or nominal ($500–$2k/mo) 90-day pilot, with a written success metric ("cut forecast error X%," "free $Y working capital").
3. **Onboard with their real data** — this forces you to fix multi-tenancy and one real integration, and it kills your simulated metrics (which is good).
4. **Land one measurable win**, get a quote and a reference, convert to a paid annual contract.

### 2.3 Pricing (directional — validate, don't overthink pre-revenue)

- **Model:** Annual SaaS subscription, tiered by scale (SKU count / locations / seats), *not* usage-based and *not* per-AI-call. Mid-market buyers want predictable spend.
- **Entry band:** ~$25k–$75k ARR for the mid-market forecasting+inventory wedge. High enough to signal enterprise seriousness and fund founder-led sales; low enough to clear a VP's budget without a board vote.
- **Expansion path:** land on demand+inventory, expand into S&OP/IBP and exec analytics (your Secondary tier) — classic land-and-expand. This is your future net revenue retention story.
- **Avoid:** free self-serve tiers (your buyer isn't self-serve), and BYO-LLM-key as the AI story (it makes AI feel like a feature you don't own — see Part 3).

### 2.4 What to build, in order (next ~90 days of engineering)

1. Multi-tenancy + server-side auth/RBAC (Platform Foundation).
2. Rock-solid CSV/Excel ingestion + one real integration path.
3. Harden the Primary loop end-to-end on *real* data: forecast → accuracy/FVA → inventory/working-capital output → consensus edit → export. Remove every mock from this path.
4. A tight onboarding + "time-to-first-forecast" experience — a design partner should see value in a day, not a quarter (this is your structural weapon vs. incumbents' 12-month deployments).

Everything not on this list waits.

---

## PART 3 — Competitive Positioning

### 3.1 The landscape, honestly

| Competitor | Strength | Weakness you exploit | Their buyer |
|---|---|---|---|
| **Kinaxis** | Concurrent planning, brand, scale | Expensive, long deployments, heavy | Large enterprise |
| **o9 Solutions** | "Enterprise brain," modern, well-funded | Very expensive, long implementations, needs a big team | Large enterprise |
| **Blue Yonder** | End-to-end breadth, retail depth | Legacy feel, integration-heavy, costly | Large enterprise/retail |
| **SAP IBP** | Embedded in SAP estates | Clunky, consultant-dependent, hated by planners | Existing SAP shops |
| **Anaplan** | Flexible modeling, finance-friendly | Not supply-chain-native, you build everything yourself | FP&A / ops planning |
| **Netstock / Inventorymid-market tools** | Affordable, mid-market focus | Shallow forecasting, weak AI, dated UX | **Your buyer** |

Your real competitive set at the start isn't o9 — it's **Excel and Netstock-tier tools.** Position there first. o9/Kinaxis are the aspirational comparison for your *pitch deck*, not your *sales cycle*.

### 3.2 Where an AI-native newcomer actually wins

Not on breadth, brand, or enterprise trust — you lose all three. You win on:

- **Time-to-value:** a day, not a year. This is structural and incumbents literally cannot match it without cannibalizing their services revenue.
- **Planner-native UX:** you've lived the job; their tools are built by people who haven't. Your Bloomberg-cockpit UI and consensus editor are already ahead here.
- **Price accessible to the mid-market** that incumbents structurally ignore.
- **A real AI moat — if you build one.** Which brings us to the honest gap.

### 3.3 The AI moat you don't have yet (and how to get one)

Today "AI-native" is aspirational: your Copilot is a client-side wrapper over Claude/OpenAI with users' own keys. Any competitor ships that in a weekend, and it owns nothing. To make "AI-native" *true* and defensible, the moat has to come from **proprietary data and workflow, not the LLM**:

- **A forecasting/decision layer that compounds with each customer's data** — FVA feedback loops, override-learning, and accuracy that improves the more the planner uses it. That's a data moat competitors can't copy by calling the same API.
- **Agentic planning workflows** — not a chatbot, but an agent that drafts the consensus forecast, flags exceptions, and proposes replenishment actions the planner approves. Decision automation, not conversation.
- **Own the inference for core loops** (you host the model / prompt IP), so "AI" isn't a setting the customer configures with their own key.

Until then, market yourself as **"the modern, planner-native planning platform for the mid-market"** and treat "AI-native" as the roadmap you're actively earning — not a claim a technical diligence call can puncture.

### 3.4 Positioning statement (draft — make it yours)

> **For mid-market supply chain teams drowning in spreadsheets, Planora AI is the planning platform that turns your own sales history into trusted forecasts and freed-up cash — in days, not the year-long deployments the enterprise tools demand. Built by a planner, for planners.**

Messaging pillars: (1) *Value in days, not years.* (2) *Built by a planner.* (3) *See it in cash and service level.* (4) *Enterprise-grade planning, mid-market-accessible.*

---

## PART 4 — Fundraising Reality + 90-Day Plan

### 4.1 The honest answer: you're not ready to raise — and shouldn't yet

As a solo, pre-customer founder with a prototype, a priced round today would be small, dilutive, and negotiated from weakness. The single highest-leverage thing you can do for your future valuation is **get 2–3 design partners and one measurable ROI case study.** That converts "impressive demo" into "early evidence of pull," which is the difference between a hard raise and an easy one.

What a seed investor will probe, and where you stand:
- *"Is this a real product or a demo?"* — Today: demo. Fix: ship the real Primary loop on real customer data.
- *"What's the moat? Isn't the AI just an API wrapper?"* — Today: yes. Fix: the data/agentic moat in 3.3, plus your domain insight and time-to-value.
- *"Why won't o9/Kinaxis crush you?"* — Answer: different buyer, different price, different deployment model. That's a strong answer *if* you've proven the mid-market pulls.
- *"Can a solo founder build this?"* — This is real. Plan to add a technical co-founder or first engineer before or during the raise; investors bet on teams.
- *"Show me pull."* — Design partners + a case study. This is the whole game pre-seed.

### 4.2 The narrative when you do raise

*"Enterprise supply-chain planning is a multi-billion-dollar market owned by slow, expensive incumbents who ignore the mid-market. I lived this pain as a demand planner. I've built a planner-native, AI-driven platform that delivers value in days instead of a year, and [N] mid-market companies are already using it to free working capital and cut forecast error. We're building the decision-intelligence layer for the companies the incumbents can't afford to serve."* — Then metrics: design partners, forecast-accuracy lift, working capital freed, early ARR, pipeline.

### 4.3 Metrics to start tracking now (even at zero revenue)

Discovery calls held → design partners signed → time-to-first-value → forecast accuracy lift (MAPE reduction) per customer → working capital freed / stockouts avoided (your ROI proof) → pilot-to-paid conversion → ARR → logo count. The accuracy-and-cash numbers are your fundraising ammunition; instrument them from customer #1.

### 4.4 The 90-day plan

**Days 1–30 — Validate the wedge (no building).**
20 ICP discovery calls. Confirm the beachhead pain, capture buyer language, line up 3–5 design-partner candidates. Freeze all Tertiary module work.

**Days 31–60 — Build the sellable core.**
Multi-tenancy + server-side auth. Real ingestion + one integration. Harden the forecast→inventory→consensus loop on real data; strip mocks from that path. Sign the first 2–3 design partners.

**Days 61–90 — Land the first win.**
Onboard design partners on their data. Instrument accuracy + working-capital metrics. Drive one measurable ROI result. Turn it into a case study, a reference, and your first paid conversation. *Then* — and only then — start the raise conversation.

---

## The one thing to remember

Your advantage is that you know this customer better than any well-funded generalist competitor ever will. Your risk is that you keep proving it by building *more*, when the market only rewards you for making *one thing* real and getting one customer to pay for it. Depth in the beachhead, ruthless "no" to everything else, and evidence of pull — in that order — is how Planora becomes a company instead of a very good demo.

*Next up when you're ready: I can turn any single section here into a working artifact — a detailed MVP spec for the Primary loop, a multi-tenancy architecture plan, the discovery-call script + question bank, a design-partner agreement, or a pitch deck outline. Tell me which and I'll go deep.*
