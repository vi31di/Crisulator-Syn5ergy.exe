"""
postmortem_agent.py — Automated postmortem generator for SWE scenarios.

WHAT IT DOES:
  At session end (win OR lose), generates a structured incident postmortem
  report in the style of real engineering postmortems (PagerDuty / Google SRE style).

  Sections:
    1. Incident summary
    2. Timeline (built from action_history — pure Python, no LLM)
    3. Root cause analysis (LLM — Groq)
    4. What went well (LLM — Groq)
    5. What went wrong (LLM — Groq)
    6. Action items (LLM — Groq)
    7. Score breakdown (pure Python)

HYBRID SPLIT:
  Pure Python:  Timeline, score breakdown, severity label, phase progression
  LLM (Groq):   RCA narrative, what went well/wrong, action items
                → 1 single LLM call (batched into one prompt to save rate limit)

CALLED FROM:
  coding_agent.py → submit_answer() when session.is_complete == True
  Route: GET /api/sandbox/postmortem/{session_id}
"""

from __future__ import annotations
import json
from datetime import datetime
from typing import Optional
from .llm_router import llm_router
from .session_manager import AgentSession


# ── Pure Python: timeline builder ─────────────────────────────────────────────

def _build_timeline(session: AgentSession) -> list[dict]:
    """
    Build a human-readable timeline from session.action_history.
    Pure Python — no LLM needed.
    """
    timeline = []
    base_time = session.started_at

    for i, entry in enumerate(session.action_history):
        elapsed  = entry["timestamp"] - base_time
        minutes  = int(elapsed // 60)
        seconds  = int(elapsed % 60)
        ts       = f"T+{minutes:02d}:{seconds:02d}"

        verdict_labels = {
            "correct":  "✅ Correct",
            "critical": "🎯 Critical",
            "wrong":    "❌ Wrong",
            "prereq":   "⚠️  Prereq missing",
            "neutral":  "➡️  Neutral",
        }
        label = verdict_labels.get(entry["verdict"], entry["verdict"])

        timeline.append({
            "timestamp":  ts,
            "command":    entry["command"],
            "verdict":    label,
            "points":     entry["points"],
            "phase":      entry["phase"],
        })

    return timeline


def _build_score_breakdown(session: AgentSession) -> dict:
    """Pure Python score analysis."""
    history = session.action_history
    if not history:
        return {}

    correct  = [e for e in history if e["verdict"] in ("correct", "critical")]
    wrong    = [e for e in history if e["verdict"] == "wrong"]
    critical = [e for e in history if e["verdict"] == "critical"]

    accuracy = round(len(correct) / len(history) * 100, 1) if history else 0

    # Time to first correct action
    first_correct_time = None
    for e in history:
        if e["verdict"] in ("correct", "critical"):
            elapsed = e["timestamp"] - session.started_at
            first_correct_time = f"{int(elapsed // 60)}m {int(elapsed % 60)}s"
            break

    # Phase where most mistakes happened
    phase_errors: dict[str, int] = {}
    for e in wrong:
        phase_errors[e["phase"]] = phase_errors.get(e["phase"], 0) + 1
    worst_phase = max(phase_errors, key=phase_errors.get) if phase_errors else "none"

    return {
        "total_actions":       len(history),
        "correct_actions":     len(correct),
        "critical_actions":    len(critical),
        "wrong_actions":       len(wrong),
        "accuracy_percent":    accuracy,
        "final_score":         session.score,
        "outcome":             session.outcome,
        "phases_completed":    session.phases_completed,
        "elapsed":             f"{int(session.elapsed_seconds() // 60)}m {int(session.elapsed_seconds() % 60)}s",
        "first_correct_time":  first_correct_time,
        "worst_phase":         worst_phase,
        "wrong_commands":      [e["command"] for e in wrong],
    }


# ── LLM: narrative sections ────────────────────────────────────────────────────

def _build_llm_sections_prompt(
    scenario:   dict,
    session:    AgentSession,
    breakdown:  dict,
    timeline:   list[dict],
) -> tuple[str, str]:
    """Build the system + user prompt for the LLM postmortem sections."""

    wrong_cmds   = breakdown.get("wrong_commands", [])
    phases_done  = breakdown.get("phases_completed", [])
    outcome      = breakdown.get("outcome", "unknown")
    worst_phase  = breakdown.get("worst_phase", "unknown")

    sys_p = (
        f"You are a senior SRE writing a formal incident postmortem.\n"
        f"Write in the style of a real Google/PagerDuty postmortem — concise, blameless, technical.\n"
        f"Return ONLY valid JSON with these exact keys:\n"
        f"  rca, went_well, went_wrong, action_items\n"
        f"Each key is a string (1-3 sentences). No markdown, no extra keys, no preamble.\n"
        f"rca = root cause analysis narrative\n"
        f"went_well = what the responder did well\n"
        f"went_wrong = what the responder did poorly or missed\n"
        f"action_items = 2-3 concrete follow-up tasks to prevent recurrence"
    )

    usr_p = (
        f"Scenario: {scenario.get('title')}\n"
        f"Brief: {scenario.get('brief', '')}\n"
        f"Outcome: {outcome}\n"
        f"Phases completed: {', '.join(phases_done)}\n"
        f"Score: {breakdown.get('final_score')}, Accuracy: {breakdown.get('accuracy_percent')}%\n"
        f"Worst phase (most errors): {worst_phase}\n"
        f"Wrong commands run: {', '.join(wrong_cmds) if wrong_cmds else 'none'}\n"
        f"Win condition: {scenario.get('winCondition', '')}\n"
        f"Lose condition: {scenario.get('loseCondition', '')}"
    )

    return sys_p, usr_p


# ── Static fallback narrative ──────────────────────────────────────────────────

def _static_postmortem_narrative(scenario: dict, breakdown: dict) -> dict:
    outcome     = breakdown.get("outcome", "unknown")
    worst_phase = breakdown.get("worst_phase", "unknown")
    wrong_cmds  = breakdown.get("wrong_commands", [])
    accuracy    = breakdown.get("accuracy_percent", 0)

    rca = (
        f"The incident originated from {scenario.get('brief', 'a system failure')}. "
        f"Response identified root cause during the {worst_phase} phase."
    )
    went_well = (
        f"Responder achieved {accuracy}% command accuracy and completed "
        f"{', '.join(breakdown.get('phases_completed', []))} phases."
    ) if outcome == "win" else (
        f"Some correct actions were taken but the incident was not fully resolved."
    )
    went_wrong = (
        f"Incorrect commands were run: {', '.join(wrong_cmds[:3])}." if wrong_cmds
        else "Response was clean with no incorrect commands."
    )
    action_items = (
        f"1. Review prerequisite ordering for {scenario.get('title')} scenario. "
        f"2. Practice the {worst_phase} phase specifically. "
        f"3. Study the mitigation path in the scenario documentation."
    )

    return {
        "rca":          rca,
        "went_well":    went_well,
        "went_wrong":   went_wrong,
        "action_items": action_items,
    }


# ── Main postmortem generator ─────────────────────────────────────────────────

class PostmortemAgent:
    """
    Generates a structured incident postmortem at session end.
    Hybrid: timeline + scores = pure Python, narrative = 1 LLM call.
    """

    def generate(
        self,
        scenario:  dict,
        session:   AgentSession,
    ) -> dict:
        """
        Generate the full postmortem report.
        Returns a dict ready to be serialised and sent to the frontend.
        """
        timeline  = _build_timeline(session)
        breakdown = _build_score_breakdown(session)

        # ── LLM narrative (1 call, batched) ───────────────────────────────────
        llm_sections = None
        sys_p, usr_p = _build_llm_sections_prompt(scenario, session, breakdown, timeline)
        raw = llm_router.generate_sync(sys_p, usr_p, max_tokens=300)

        if raw:
            try:
                # Strip markdown fences if present
                clean = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
                llm_sections = json.loads(clean)
                # Validate expected keys
                required = {"rca", "went_well", "went_wrong", "action_items"}
                if not required.issubset(llm_sections.keys()):
                    llm_sections = None
            except (json.JSONDecodeError, AttributeError):
                llm_sections = None

        if not llm_sections:
            llm_sections = _static_postmortem_narrative(scenario, breakdown)

        # ── Severity rating ───────────────────────────────────────────────────
        accuracy = breakdown.get("accuracy_percent", 0)
        if accuracy >= 90 and session.outcome == "win":
            rating = "Exemplary"
        elif accuracy >= 70 and session.outcome == "win":
            rating = "Satisfactory"
        elif accuracy >= 50:
            rating = "Needs improvement"
        else:
            rating = "Critical gaps identified"

        return {
            "postmortem": {
                "title":          f"Incident Postmortem — {scenario.get('title')}",
                "generated_at":   datetime.utcnow().isoformat() + "Z",
                "severity":       scenario.get("severity", "SEV1"),
                "outcome":        session.outcome,
                "performance_rating": rating,

                "summary": {
                    "incident":   scenario.get("brief", ""),
                    "win_condition":  scenario.get("winCondition", ""),
                    "lose_condition": scenario.get("loseCondition", ""),
                },

                "score_breakdown": breakdown,
                "timeline":        timeline,

                "rca":          llm_sections["rca"],
                "went_well":    llm_sections["went_well"],
                "went_wrong":   llm_sections["went_wrong"],
                "action_items": llm_sections["action_items"],

                "source": "llm" if raw else "static",
            }
        }


postmortem_agent = PostmortemAgent()
