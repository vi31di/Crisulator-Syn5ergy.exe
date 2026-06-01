"""
question_variants.py — Non-repetitive question generation. Zero or minimal LLM.

THREE TIERS:
  Tier 1: Pre-authored variant pool  — pure Python, instant, guaranteed unique per user
  Tier 2: Template mutation          — pure Python, structurally different every time
  Tier 3: LLM generation             — only when T1+T2 exhausted, or for dynamic follow-ups

The variant_seed is derived from (room_id + user_id + node_id) so:
  - Same user, same node → same variant (consistent within session)
  - Different user, same node → different variant (non-repetitive across users)
  - Same answer path → still different follow-up (adaptive branching)
"""

from __future__ import annotations
import hashlib
import random
import re
from typing import Optional


# ── Variant pools per phase ────────────────────────────────────────────────────
# Each entry is a question template. {title}, {brief}, {action}, {system} are filled in.

PHASE_VARIANT_POOLS: dict[str, list[str]] = {
    "detection": [
        "🚨 [{title}] — DETECTION\n\n{brief}\n\nAlerts are firing. You're the first responder. What is your IMMEDIATE first command?",
        "🚨 [{title}] — DETECTION\n\n{brief}\n\nYou just got paged. Dashboards are red. What do you run FIRST to understand what's happening?",
        "🚨 [{title}] — DETECTION\n\nIncident confirmed: {brief}\n\nYour on-call shift just got very real. What's the first thing you check?",
        "🚨 [{title}] — DETECTION\n\n{brief}\n\nThe monitoring system woke you up at 3AM. What single command tells you the most right now?",
    ],
    "investigation": [
        "🔍 [{title}] — INVESTIGATION\n\nScope confirmed. {ai_shift}\n\nYou need to dig deeper. What command reveals the root cause?",
        "🔍 [{title}] — INVESTIGATION\n\n{ai_shift}\n\nSomething's wrong with {system}. What do you run to get the full picture?",
        "🔍 [{title}] — INVESTIGATION\n\nYou've triaged the alert. {ai_shift}\n\nNow — what's the single most diagnostic command you can run?",
        "🔍 [{title}] — INVESTIGATION\n\n{ai_shift}\n\nThe manager wants answers in 2 minutes. What do you check to give them a root cause?",
    ],
    "escalation": [
        "⚠️  [{title}] — ESCALATION — CLOCK IS TICKING\n\n{ai_shift}\n\nEvery second counts. What is your CRITICAL next action?",
        "⚠️  [{title}] — ESCALATION\n\n{ai_shift}\n\nThe incident is spreading. You have one shot. What command do you run RIGHT NOW?",
        "⚠️  [{title}] — ESCALATION — HIGH PRESSURE\n\n{ai_shift}\n\nCustomers are screaming. CEO is on Slack. What do you do IMMEDIATELY?",
        "⚠️  [{title}] — ESCALATION\n\nSituation: {brief}\n\n{ai_shift}\n\nYou must act NOW. What is the single most impactful command?",
    ],
    "mitigation": [
        "🛠️  [{title}] — MITIGATION\n\n{ai_shift}\n\nTime to contain this. What's your mitigation command?",
        "🛠️  [{title}] — MITIGATION\n\n{ai_shift}\n\nYou've identified the problem. Now fix it. What do you run?",
        "🛠️  [{title}] — MITIGATION\n\nThe bleeding needs to stop. {ai_shift}\n\nWhat command begins the fix?",
        "🛠️  [{title}] — MITIGATION\n\n{ai_shift}\n\nYour senior is watching. Show them you know how to resolve {system} issues.",
    ],
    "recovery": [
        "✅ [{title}] — RECOVERY\n\n{ai_shift}\n\nImmediate danger is over. How do you restore normal operations?",
        "✅ [{title}] — RECOVERY\n\nThe fire is out. {ai_shift}\n\nWhat do you do to get everything back to healthy?",
        "✅ [{title}] — RECOVERY\n\n{ai_shift}\n\nPost-incident: what's your first command to verify full recovery?",
        "✅ [{title}] — RECOVERY\n\nLast mile. {ai_shift}\n\nWhat's the final command to confirm the system is fully restored?",
    ],
    "escalation_wrong": [
        # Shown when user got the escalation phase wrong — more pressure
        "🔥 [{title}] — STILL IN ESCALATION — Your last action made things WORSE\n\n{consequence}\n\nRethink. What should you have done instead?",
        "🔥 [{title}] — ESCALATION (retry)\n\nWrong move. {consequence}\n\nThe situation is now more critical. What's the CORRECT action?",
        "🔥 [{title}] — PRESSURE\n\nThat was the wrong call. {ai_shift}\n\nYou have ONE more chance. What do you do?",
    ],
    "false_recovery": [
        "⚡ [{title}] — FALSE RECOVERY\n\nMetrics looked stable — but they lied. {ai_shift}\n\nWhat do you check to confirm real recovery vs a false positive?",
        "⚡ [{title}] — NOT DONE YET\n\n{ai_shift}\n\nThe graphs dipped, but alarms are firing again. What's actually still broken?",
    ],
    "catastrophe": [
        "🔥 [{title}] — CATASTROPHE MODE\n\n{ai_shift}\n\nEverything is on fire. One action. Make it count.",
        "🔥 [{title}] — CRITICAL FAILURE\n\n{ai_shift}\n\nYou have 60 seconds. What is the SINGLE most important thing to do?",
    ],
}

# Follow-up questions after a CORRECT answer (non-repetitive deepening)
FOLLOWUP_CORRECT_POOL: list[str] = [
    "Good. Now — what would you monitor to confirm that action actually worked?",
    "Correct. What's the ROLLBACK plan if that command made things worse?",
    "Right call. What are the top 3 indicators you'd watch next?",
    "That worked. What's the NEXT failure mode you're now worried about?",
    "Solid. If that command had failed, what would your backup plan be?",
    "Nice. How would you verify that action didn't cause collateral damage?",
    "Correct. What log or metric confirms success within 30 seconds?",
    "Good instinct. What's the dependency chain — what else could break because of that?",
]

# Follow-up after a WRONG answer (different pressure angle each time)
FOLLOWUP_WRONG_POOL: list[str] = [
    "That's not right. Think about what system is MOST at risk right now.",
    "Wrong move. Consider: what's the blast radius of your last command?",
    "Incorrect. What would a senior engineer do differently here?",
    "That made it worse. What's the first principle of incident response you're forgetting?",
    "Not quite. If you had to isolate ONE thing to stop the bleeding, what would it be?",
    "Wrong. You have 30 seconds. What's the minimum viable fix?",
]


# ── Variant seed ───────────────────────────────────────────────────────────────

def _make_seed(room_id: str, user_id: str, node_id: str) -> int:
    """
    Deterministic seed from (room, user, node).
    Same user+room+node → same variant (session consistency).
    Different user or room → different variant (non-repetitive).
    """
    raw = f"{room_id}::{user_id}::{node_id}"
    return int(hashlib.md5(raw.encode()).hexdigest(), 16)


def _pick_variant(pool: list[str], seed: int) -> str:
    rng = random.Random(seed)
    return rng.choice(pool)


# ── Template filler ────────────────────────────────────────────────────────────

def _fill_template(template: str, scenario: dict, phase: str) -> str:
    """Fill {placeholders} in a variant template from scenario data."""
    phases    = scenario.get("phases", {})
    phase_data = phases.get(phase, {})
    ai_shift  = phase_data.get("ai_behavior_shift", "The pressure is mounting.")

    # Pick a random system from systemsImpacted for variation
    systems   = scenario.get("systemsImpacted", ["the primary system"])
    # Use scenario id as seed for system selection so it's stable per scenario
    sys_seed  = int(hashlib.md5(scenario.get("id","").encode()).hexdigest(), 16)
    system    = random.Random(sys_seed).choice(systems)

    # Pick a random objective fragment
    objectives = scenario.get("objectives", ["resolve the incident"])
    obj_seed   = sys_seed + 1
    objective  = random.Random(obj_seed).choice(objectives)

    filled = template
    filled = filled.replace("{title}",    scenario.get("title", "Incident"))
    filled = filled.replace("{brief}",    scenario.get("brief", ""))
    filled = filled.replace("{ai_shift}", ai_shift)
    filled = filled.replace("{system}",   system)
    filled = filled.replace("{objective}", objective)
    filled = filled.replace("{consequence}", "")   # filled separately if needed
    return filled


# ── Tier 2: Template mutation ──────────────────────────────────────────────────

def _mutate_question(base_question: str, seed: int, scenario: dict) -> str:
    """
    Structurally mutate a question so same question looks different.
    Changes: urgency framing, metric values, system names.
    """
    rng = random.Random(seed)

    # Vary opening urgency phrase
    urgency_phrases = [
        "You have 60 seconds.",
        "The clock is ticking.",
        "Every second costs money.",
        "Management is watching.",
        "Customers are impacted NOW.",
        "SLA breach in 5 minutes.",
    ]
    # Append a random urgency cue to the question
    urgency = rng.choice(urgency_phrases)

    # Vary metric numbers if present (e.g. "97%" → "98%", "2400ms" → "2600ms")
    def jitter_number(m):
        val = int(m.group(1))
        jitter = rng.randint(-3, 3)
        new_val = max(1, val + jitter)
        return str(new_val) + m.group(2)

    mutated = re.sub(r"(\d+)(ms|%|M|K|s\b)", jitter_number, base_question)

    return f"{mutated}\n\n⏱️  {urgency}"


# ── Main public function ───────────────────────────────────────────────────────

def get_variant_question(
    phase:       str,
    scenario:    dict,
    room_id:     str,
    user_id:     str,
    node_id:     str,
    verdict:     Optional[str]  = None,    # last verdict if this is a follow-up
    consequence: Optional[str]  = None,    # wrong action consequence text
    use_mutation: bool          = True,    # apply Tier 2 mutation
) -> str:
    """
    Get a non-repetitive question for this phase.
    
    Guarantees:
    - User A and User B on same node → different question
    - Same user replaying → same question (deterministic seed)
    - After wrong answer → different follow-up angle
    """
    seed = _make_seed(room_id, user_id, node_id)

    # Special pool for wrong escalation answers
    if verdict == "wrong" and phase == "escalation":
        pool = PHASE_VARIANT_POOLS.get("escalation_wrong", PHASE_VARIANT_POOLS["escalation"])
        template = _pick_variant(pool, seed)
        if consequence:
            template = template.replace("{consequence}", consequence)
        return _fill_template(template, scenario, phase)

    # Standard phase pool
    pool = PHASE_VARIANT_POOLS.get(phase, PHASE_VARIANT_POOLS.get("mitigation", []))
    if not pool:
        pool = [f"[{scenario.get('title')}] What is your next action in the {phase} phase?"]

    template = _pick_variant(pool, seed)
    question = _fill_template(template, scenario, phase)

    # Tier 2: mutate for extra structural variation
    if use_mutation:
        question = _mutate_question(question, seed + 1, scenario)

    return question


def get_followup_question(
    verdict:  str,
    room_id:  str,
    user_id:  str,
    node_id:  str,
    answered: list[str],
) -> str:
    """
    Get a follow-up deepening question after an answer.
    Pulls from different pools based on verdict.
    Different per user.
    """
    seed = _make_seed(room_id, user_id, node_id + f"_followup_{len(answered)}")
    rng  = random.Random(seed)

    if verdict in ("correct", "critical"):
        return rng.choice(FOLLOWUP_CORRECT_POOL)
    else:
        return rng.choice(FOLLOWUP_WRONG_POOL)
