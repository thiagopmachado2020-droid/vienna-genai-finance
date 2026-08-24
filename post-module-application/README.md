# Diversified Quality & Defensive Growth

Post-Module SPA/dashboard for **Generative AI in Finance**, WU Executive Academy.

## Methodology

1. Screen the Core 10 plus five expansion candidates.
2. A security passes only when **RSI(14) < 70** and the **MACD(12,26,9) histogram > 0**.
3. Form the submitted Finance-track portfolio with **equal weights among the survivors**.
4. Display inverse-volatility weights as a **monitoring reference only**.
5. Require human review before OpenRouter/Claude can interpret the finished calculations.

RSI, MACD, annualized volatility and both weight sets are calculated deterministically in JavaScript. The LLM never calculates signals or allocations.

## Data and keys

- Twelve Data: live daily OHLC used by the browser screen.
- OpenRouter / Claude Sonnet: interpretation after the human-review gate.
- newsdata.io: optional headlines.
- Riskline: optional macro-risk relevance overlay.

API keys are entered at runtime, retained in memory only and never written to localStorage or this repository. Because GitHub Pages is a public client-side application, browser-entered keys should be restricted, disposable demonstration keys where the provider supports that practice.

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm ci
npm run build
```

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and deploys every push to `main`. In repository settings, configure Pages to use **GitHub Actions**.

## Demonstration reference

The included `portfolio_summary.json` records the supplied August 4, 2026 example. ABNB, CEG and ADSK passed. The submitted allocation is 33.3% each; inverse-volatility reference weights are 41.2%, 33.1% and 25.7%, respectively. These values are demonstration inputs, not live output.
