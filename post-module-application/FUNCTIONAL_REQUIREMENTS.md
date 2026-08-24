# Functional Requirements Document

## 1. Investment thesis

**Diversified Quality & Defensive Growth** combines quality/growth companies with defensive exposures across Information Technology, Consumer Discretionary, Financials, Health Care, Utilities and Consumer Staples.

**Core 10:** AAPL, ABNB, ACGL, ADSK, AFL, AIG, ALGN, CEG, CL, COR.  
**Expansion 5:** AEE, AEP, AES, ATO, BG.

## 2. Selection and allocation

- A candidate passes only when **RSI(14) < 70 AND MACD(12,26,9) histogram > 0**.
- RSI, MACD and annualized volatility are calculated in JavaScript, never by an LLM.
- The **submitted portfolio** is equally weighted among all screen survivors: `w_i = 1 / N`.
- An inverse-volatility allocation, `w_i = (1/vol_i) / sum(1/vol_j)`, is displayed for monitoring and comparison only.
- News and macro context never alter a signal or portfolio weight.

## 3. Data sources

| Source | Authentication | Purpose |
|---|---|---|
| Twelve Data | Runtime API key | Daily OHLC for the deterministic screen |
| OpenRouter / Claude Sonnet | Runtime API key | Strict-schema interpretation of finished evidence |
| newsdata.io | Optional runtime API key | Recent headline context |
| Riskline | None in current endpoint | Optional macro-risk relevance overlay |

## 4. Application behavior

- Prefill all 15 candidates and the required RSI/MACD parameters.
- Accept API keys only at runtime and never persist them.
- Fetch every ticker independently so one error does not block the entire screen.
- Show coverage, Core/Expansion group, RSI, MACD histogram, volatility and PASS/FAIL status.
- Show the submitted equal-weight allocation first and the inverse-volatility reference second.
- Keep **Generate Research Note** disabled until the user confirms human review.
- Send both allocations to the LLM with unambiguous submitted/reference labels.
- Require strict JSON output with a summary, top conviction and three risks.
- Prevent the LLM prompt from recomputing indicators or treating reference weights as submitted weights.
- Publish the Vite production build through GitHub Actions to GitHub Pages.

## 5. Acceptance criteria

- Submitted survivor weights sum to 100% (subject only to display rounding).
- Reference weights sum to 100% and are visibly labeled non-submitted.
- No portfolio is formed when no security passes.
- The review gate blocks LLM generation until checked.
- `npm run build` completes successfully and produces Pages-compatible relative assets.
