"""Outreach templates that pair with a specific resume variant.

Kept apart from the bootstrap command because the copy changes far more often
than the seeding logic does, and because every claim in here has to stay
matched to something real on the resume. Nothing below is embellished: the
throughput figures, the placement, and the 40% asset-time reduction all come
from the resume as written.
"""

BACKEND_BODY = """Hi {{first_name}},

I'm {{my_name}}, a final-year CS student graduating April 2027, and I'd like to
be considered for {{role}} at {{company}}.

Three things I've built that are closest to production backend work:

- A high-throughput flash-sale engine in Java and Spring Boot handling 10,000+
  TPS under 5ms, using Redis atomic locking for zero overselling and Kafka to
  keep write spikes off PostgreSQL.
- HookGuard, a zero-dependency Go gateway that verifies inbound webhook
  signatures for Stripe, Shopify, GitHub and PayPal behind one pluggable
  interface, with constant-time HMAC-SHA256 and an SSRF guard on PayPal's
  certificate fetch.
- Cappy, a browser-based caption studio with a zero-server-cost render pipeline
  built on Remotion, canvas burn-in and ffmpeg.wasm.

I also spent Jun-Aug 2025 as an ML/LLM intern at Red Panda Games, building
text-to-3D asset pipelines on FastAPI and AWS.

Code: {{my_github}}
Work: {{my_portfolio}}

Resume attached. Would a short call be worth your time?

Best,
{{my_name}}"""

AI_BODY = """Hi {{first_name}},

I'm {{my_name}}, a final-year CS student graduating April 2027. I saw {{role}}
at {{company}} and wanted to introduce myself, because retrieval quality is the
part of this work I actually enjoy.

What I've shipped:

- KisanGPT, a bilingual agricultural advisory system: a RAG pipeline over Qdrant
  vector search across 3.5 lakh+ KCC records and domain PDFs, with dynamic
  context fusion into Gemini. It placed 3rd of 200+ teams at Smart India
  Hackathon 2025.
- Six months as an ML/LLM intern at Red Panda Games, building a
  text-to-image-to-3D pipeline with SDXL, Hunyuan3D, FastAPI and AWS that cut
  manual asset creation time by around 40%, with prompt-conditioning that held
  output consistency near 95%.
- PhishX, multilingual SMS phishing detection combining BERT, XLM-R and TF-IDF
  Naive Bayes, with attention-based explainability for borderline cases.

The backend around these is mine too - FastAPI and Django, plus a Java/Spring
Boot service handling 10,000+ TPS.

Code: {{my_github}}
Work: {{my_portfolio}}

Resume attached. Happy to talk whenever suits.

Best,
{{my_name}}"""

FOLLOWUP_BODY = """Hi {{first_name}},

I applied for {{role}} at {{company}} a little over a week ago and wanted to add
something rather than simply resend.

Since applying I've [REPLACE: shipped X / read Y about your product / noticed Z
in your stack] - happy to walk through how I'd approach it.

If the role is filled or on hold that's completely fine, and a one-line reply
saves me guessing. If it's still open, I'd welcome a short call.

Portfolio: {{my_portfolio}}

Thanks,
{{my_name}}"""

NUDGE_BODY = """Hi {{first_name}},

Following up on my note from last week about {{role}} at {{company}}.

Short version of why I think it's a fit: [REPLACE with the one line that matters
most for this company].

If it isn't, no problem at all - I'd rather know than keep chasing.

Best,
{{my_name}}"""

# resume_variant tells the dashboard which PDF to attach when composing.
TEMPLATES = [
    {
        'name': 'Cold Outreach - Backend / SDE (2027)',
        'category': 'Job Search',
        'description': 'First touch for a backend or general SDE role. Attach the backend resume.',
        'subject': 'Backend engineer, 2027 grad - interested in {{company}}',
        'body': BACKEND_BODY,
    },
    {
        'name': 'Cold Outreach - AI / ML (2027)',
        'category': 'Job Search',
        'description': 'First touch for an ML, LLM or RAG role. Attach the AI/ML resume.',
        'subject': 'RAG and vector search work - interested in {{role}} at {{company}}',
        'body': AI_BODY,
    },
    {
        'name': 'Follow-up - Application, no reply',
        'category': 'Follow-up',
        'description': 'For an application you wrote real answers for. Adds something rather than bumping.',
        'subject': 'Following up - {{role}} application',
        'body': FOLLOWUP_BODY,
    },
    {
        'name': 'Follow-up - Cold email, no reply',
        'category': 'Follow-up',
        'description': 'Second and final touch on a cold thread. Gives them an easy way to say no.',
        'subject': 'Following up - {{company}}',
        'body': NUDGE_BODY,
    },
]
