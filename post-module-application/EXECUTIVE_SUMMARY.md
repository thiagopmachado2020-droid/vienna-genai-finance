# Executive Summary

**Thesis.** Diversified Quality & Defensive Growth combines a six-sector equity universe with a transparent momentum screen. The architecture deliberately separates deterministic finance calculations from generative interpretation.

**Screening rule.** A security passes only when RSI(14) is below 70 and the MACD(12,26,9) histogram is positive. JavaScript calculates RSI, MACD, annualized volatility and portfolio weights; the LLM interprets completed evidence only.

**Portfolio construction.** The submitted Finance-track portfolio is equally weighted among all screen survivors. Inverse-volatility weights are shown only as a monitoring comparison and never replace the submitted allocation.

**Demonstration result.** In the supplied August 4, 2026 example, ABNB, CEG and ADSK passed. The submitted allocation is therefore 33.3% per security. The comparison allocation is ABNB 41.2%, CEG 33.1% and ADSK 25.7%. The figures are labeled as demonstration data, not live output.

**Human control and AI.** The dashboard presents every signal, both allocation views, coverage and optional context before enabling commentary. The user must explicitly complete the review gate. OpenRouter/Claude receives strict instructions not to calculate indicators or weights and not to confuse comparison weights with the submitted portfolio.

**Risks.** A small survivor set can produce concentration, technical signals can whipsaw, APIs may fail or throttle requests, and a browser-hosted public SPA cannot conceal a key supplied at runtime. These risks are mitigated through transparent calculations, per-ticker error handling, explicit labeling, non-persistent keys and mandatory human review.
