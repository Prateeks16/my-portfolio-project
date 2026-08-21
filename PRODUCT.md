# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary — the operator (one person: Prateek Sahu).** A final-year CS undergraduate (B.Tech, Galgotias College, Sep 2023 – Apr 2027) running an active outbound job search for backend and applied-ML roles. He works the CRM privately, most often in a focused session: pick targets, draft personalised emails against real project evidence, send, and chase follow-ups before they go cold. His job on any given visit is "who do I contact next, and what do I say to them."

**Secondary — recruiters and hiring managers.** Arrive at the public portfolio from an outreach email, a resume link, or a LinkedIn profile. They are scanning, not reading: they want to establish credibility in well under a minute, confirm the work is real, and leave with the resume or a way to make contact.

**Secondary — engineering peers and open-source maintainers.** Arrive from GitHub or a shared link. They want technical depth, evidence the code exists and runs, and a sense of what the person actually builds.

## Product Purpose

One system with two faces over a single content store:

- A **public portfolio** that converts a scan into credibility and a contact.
- A **private CRM** that runs the outbound campaign which drives traffic to that portfolio, and closes the loop by showing which outreach actually produced visits.

Success for the portfolio is a recruiter who leaves with the resume or sends a message. Success for the CRM is that no warm lead goes un-followed-up, and that drafting a personalised, evidence-backed email takes under a minute.

## Positioning

A portfolio that is instrumented. The same database serves the public site and the private dashboard, so outreach, traffic, and pipeline are one loop rather than three disconnected tools: an email sent from the CRM is attributable to the page views and the contact-form message it produces. A neighbouring "portfolio template" cannot copy this, because it has no back end and no record of who was contacted.

## Operating Context

- **Stack (existing, not up for decision):** Django 6 + DRF + SimpleJWT backend on Render, Postgres in production and SQLite locally; React 19 + Vite + Tailwind 3 front end on Vercel; Cloudinary for media.
- **Two surfaces, one app:** `/` is the public portfolio (unauthenticated, read-only against the public API). `/dashboard/*` is JWT-gated and is the only place content is written.
- **Render free tier cold-starts.** The first request after idle can take ~60 seconds. Loading states are a real design requirement, not a nicety.
- **Outreach rhythm:** compose from a template, personalise against a specific lead, save as draft, review, send, set a follow-up date. Follow-ups falling due is the recurring daily trigger.
- **Sending is credential-gated.** With no SMTP credentials in the backend environment, the CRM still drafts and stores everything but refuses to transmit, with an explicit message. This is deliberate and must stay visible in the UI.

## Capabilities and Constraints

Confirmed and built: leads with a seven-stage pipeline (new → contacted → replied → interviewing → offer → won/lost), an append-only activity timeline per lead, reusable email templates with `{{placeholder}}` rendering against real profile and lead data, outreach drafts with an explicit send action, tasks with due dates and priorities, privacy-preserving first-party analytics (page views and named events, session id only — no cookies, no IP storage, no fingerprinting), live GitHub repo statistics, contact-form inbox with one-click conversion to a lead, and authenticated CRUD over every piece of public content.

Constraints: single operator, so no roles, permissions, or multi-tenancy. No paid third-party analytics or CRM service. Analytics history begins at deploy — there is no backfill, so early empty states are the normal first experience and must be designed for.

Undecided: whether SMTP sending is ever enabled, and under which address.

## Brand Commitments

The incumbent portfolio has a deliberate and reasonably distinctive editorial identity that is treated as binding: warm paper ground (`#ECEBE9`), near-black ink (`#1A1A1A`), Playfair Display for display type, Manrope for text, oversized serif headlines set tight, and generous rules and whitespace. Voice is plain and unembellished — first person, no superlatives, no growth-hacking tone.

Real identity facts: name Prateek Sahu; GitHub `Prateeks16`; LinkedIn `in/prateeks16`; email `prateeksahu529pvt@gmail.com`; based in Greater Noida, Uttar Pradesh.

## Evidence on Hand

All of the following are real, live in the production database, and must never be padded with invented work:

- **Experience:** ML & LLM Data Scientist intern, Red Panda Games (Jun–Aug 2025, remote) — text→image→3D biome pipelines with SDXL, Hunyuan3D, FastAPI, AWS. Plus two Forage virtual simulations (BCG, Commonwealth Bank).
- **Projects:** KisanGPT (RAG advisory over 3.5L+ KCC queries, Qdrant + Gemini, live Streamlit demo); Reddit Sentiment Analyzer (RoBERTa, ~68% accuracy, live demo); PhishX (multilingual SMS phishing detection, BERT + XLM-R + TF-IDF, with explainability).
- **Achievements:** 3rd place, Smart India Hackathon 2025, institute level, top 1.5% of 200+ teams (KisanGPT). Finalist, Galgotias International Hackathon (PayRight AI).
- **Skills:** Python, Java, SQL; React, Django, FastAPI, Streamlit; pandas, NumPy, Matplotlib, TensorFlow, PyTorch, HuggingFace, spaCy, NLTK, scikit-learn.
- **Assets:** resume PDF and profile photo on Cloudinary; 38 public GitHub repos including `hookguard` (Go), `high-performance-flashsale` (Java/Spring Boot), `radar` (Python).

Absences that must not be fabricated: no testimonials, no client references, no press, no user or revenue numbers, no stars on any repo. The skills tables in the database are currently empty — skill data lives only in the resume.

## Product Principles

1. **Evidence over adjectives.** Every claim on the public site resolves to a shipped artefact, a measured number, or a placement. Where there is no evidence, there is no claim.
2. **One store, two faces.** Content is authored once in the CRM and rendered by the portfolio. No parallel copies, no hardcoded duplicates of database content.
3. **The pipeline is the front door.** The CRM opens on what needs doing today — follow-ups due, drafts waiting, leads gone quiet — not on a wall of vanity metrics.
4. **Drafting is free; sending is deliberate.** Composing is fast and reversible. Transmission is an explicit, single-recipient act that fails loudly rather than silently.
5. **Slow back end, honest front end.** Cold starts and empty datasets are designed states with real skeletons and real empty copy, never a blank screen or a spinner with no explanation.

## Accessibility & Inclusion

No user-specific requirement was established. Baseline standard applies: WCAG 2.2 AA contrast on both surfaces, visible focus rings on every interactive element, full keyboard operability of the dashboard (it is a data tool used at speed), semantic headings and landmarks, and honoured `prefers-reduced-motion`.
