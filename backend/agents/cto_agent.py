"""
cto_agent.py — CTO Agent for SWE scenarios.

WHAT IT DOES:
  Fires exclusively during the ESCALATION phase of SWE scenarios.
  Asks architecture-level, system-design, and root-cause questions that
  go deeper than the standard Manager pressure lines.

  The Manager asks "What's your ETA?" — the CTO asks
  "Walk me through why this specific component is the blast radius."

WHEN IT'S CALLED (from coding_agent.py):
  - Phase = escalation AND domain = swe
  - After any answer (correct or wrong) — CTO always probes deeper here
  - Max 2 CTO calls per session (they're expensive + high value)

LLM USAGE:
  - Groq primary (fast, low latency — feels like a real senior grilling you)
  - Gemini fallback
  - Static pool fallback if both rate-limited
"""

from __future__ import annotations
import random, hashlib
from typing import Optional
from .llm_router import llm_router


# ── Static fallback pool ───────────────────────────────────────────────────────
# Used when LLM is rate-limited. Seeded per session so not repetitive.

CTO_ESCALATION_QUESTIONS = [
    "Before you touch anything else — what's the blast radius if that service goes down completely?",
    "Walk me through the dependency chain. What breaks downstream if this isn't resolved in 10 minutes?",
    "What's the single point of failure here, and why wasn't it caught in the last architecture review?",
    "If you had to roll this back right now with zero data loss — what's your plan?",
    "What circuit breakers should have triggered before we got here? Why didn't they?",
    "Give me a failure mode analysis. What's the worst case if your next command doesn't work?",
    "Why is this service not horizontally scalable? Is that a design flaw or a constraint?",
    "What does the runbook say to do here? Did you check it before your last action?",
    "What monitoring gap allowed this to go undetected until it was SEV0?",
    "If I asked you to write the post-mortem root cause section right now — what would you write?",
    "What's the recovery time objective for this service? Are we inside or outside that window?",
    "Why is this component not idempotent? That seems like the core issue here.",
]

CTO_CORRECT_PROBES = [
    "Good call. Now — what's the observability story? How do you confirm that worked at scale?",
    "Right. But what's the retry behavior on dependent services? Could we be creating a stampede?",
    "That's the fix. What's the permanent architectural change to prevent this class of failure?",
    "Correct. What would the SLO dashboard show right now if we had proper instrumentation?",
    "Good. Now walk me through the rollback plan if metrics degrade in the next 5 minutes.",
    "That works. What's the load test that should have caught this before production deployment?",
]

CTO_WRONG_PROBES = [
    "That's not right and it's going to make this worse. What's your mental model of this system?",
    "Wrong direction. Step back — what does the dependency graph actually look like here?",
    "That command assumes the wrong root cause. What evidence are you basing that on?",
    "No. That touches a shared resource. What's the cascade risk you're not considering?",
    "Incorrect. Before you run anything else — what does the architecture diagram tell you?",
]


def _static_cto_question(session_id: str, verdict: str, question_count: int) -> str:
    """Pick a non-repetitive static CTO question based on session seed."""
    seed = int(hashlib.md5(f"{session_id}:cto:{question_count}".encode()).hexdigest(), 16)
    rng  = random.Random(seed)
    if verdict in ("correct", "critical"):
        return rng.choice(CTO_CORRECT_PROBES)
    elif verdict == "wrong":
        return rng.choice(CTO_WRONG_PROBES)
    return rng.choice(CTO_ESCALATION_QUESTIONS)


# ── CTO Agent ─────────────────────────────────────────────────────────────────

class CTOAgent:
    """
    Fires during escalation phase of SWE scenarios only.
    Asks architecture / root-cause questions on top of the standard
    Manager pressure line — represents senior technical scrutiny.
    """

    CTO_PERSONAS = {
        "aws_s3_outage":          ("Sarah Chen",   "VP of Infrastructure"),
        "cloudflare_global_outage":("Jocelyn Park", "CTO"),
        "facebook_bgp_outage":    ("Sarah",         "CTO"),
        "gitlab_database_deletion":("Alex Rodrigues","VP Engineering"),
        "knight_capital_disaster": ("Richard Hayes", "CTO"),
        "payments_retry_storm":    ("David Kim",     "CTO"),
        # fallback
        "default":                 ("CTO",           "Chief Technology Officer"),
    }

    def get_cto_reaction(
        self,
        scenario:       dict,
        session_id:     str,
        command:        str,
        verdict:        str,
        phase:          str,
        cto_calls_used: int,
        max_cto_calls:  int = 2,
    ) -> Optional[dict]:
        """
        Returns a CTO reaction dict, or None if not applicable.

        Only fires when:
          - phase == "escalation"
          - cto_calls_used < max_cto_calls
          - domain is SWE
        """
        if phase != "escalation":
            return None
        if cto_calls_used >= max_cto_calls:
            # Silently skip — don't tell user we ran out of CTO calls
            return None

        scenario_id = scenario.get("id", "default")
        name, role  = self.CTO_PERSONAS.get(scenario_id, self.CTO_PERSONAS["default"])
        personalities = scenario.get("stakeholder_personalities", {})
        persona       = personalities.get("CTO", personalities.get("cto", {}))
        style  = persona.get("style", "analytical") if isinstance(persona, dict) else str(persona)
        traits = persona.get("traits", []) if isinstance(persona, dict) else []
        trait_text = ", ".join(traits) if traits else "technical and precise"

        sys_p = (
            f"You are {name}, the {role} for this incident.\n"
            f"Communication style: {style}. Traits: {trait_text}.\n"
            f"Scenario: {scenario.get('title')} — {scenario.get('brief', '')}\n\n"
            f"RULES:\n"
            f"- Ask ONE pointed architecture or system-design question\n"
            f"- You are technically senior — probe for depth, not just the fix\n"
            f"- If the user was wrong, challenge their mental model\n"
            f"- If the user was correct, push them to think about prevention/observability\n"
            f"- Max 2 sentences. Never reveal the answer.\n"
            f"- You are under pressure but remain technical and precise.\n"
            f"- Severity: {scenario.get('severity', 'SEV0')}"
        )

        usr_p = (
            f"The engineer just ran: '{command}'\n"
            f"Result: {verdict}\n"
            f"We are in the escalation phase. Ask your architecture-level follow-up question."
        )

        llm_response = llm_router.generate_sync(sys_p, usr_p, max_tokens=100)

        if llm_response:
            return {
                "agent":   name,
                "role":    role,
                "message": llm_response,
                "source":  "llm",
                "type":    "cto_escalation",
            }

        # Static fallback
        return {
            "agent":   name,
            "role":    role,
            "message": _static_cto_question(session_id, verdict, cto_calls_used),
            "source":  "static",
            "type":    "cto_escalation",
        }


cto_agent = CTOAgent()
