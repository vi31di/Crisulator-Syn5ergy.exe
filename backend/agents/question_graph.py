"""
question_graph.py — GMAT-style adaptive graph. Now uses question_variants.py
for non-repetitive questions across users.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
from .evaluator import VERDICT_CRITICAL, VERDICT_CORRECT, VERDICT_WRONG, VERDICT_PREREQ

PHASE_ORDER = [
    "detection", "investigation", "escalation",
    "false_recovery", "catastrophe", "mitigation", "recovery"
]


@dataclass
class QuestionNode:
    question_id:  str
    base_question: str          # template — actual text rendered per-user in coding_agent
    hint:         str
    difficulty:   int
    phase:        str
    domain:       str
    expected:     list[str]
    wrong:        list[str]
    on_correct:   Optional[str] = None
    on_wrong:     Optional[str] = None
    on_critical:  Optional[str] = None


def build_graph(scenario: dict) -> dict[str, QuestionNode]:
    phases     = scenario.get("phases", {})
    scoring    = scenario.get("scoring", {})
    mitigation = scenario.get("mitigation_path", [])
    winning    = scoring.get("winning_actions", scenario.get("possibleActions", []))
    bad        = scoring.get("bad_actions", scenario.get("wrongActions", []))
    domain     = _detect_domain(scenario)

    available_phases = [p for p in PHASE_ORDER if p in phases]
    if not available_phases:
        available_phases = ["detection", "mitigation"]

    nodes: dict[str, QuestionNode] = {}

    for i, phase_name in enumerate(available_phases):
        node_id    = f"{scenario['id']}_{phase_name}"
        retry_id   = f"{scenario['id']}_{phase_name}_retry"
        difficulty = _phase_to_difficulty(phase_name)
        phase_actions = _slice_actions_for_phase(mitigation, i, len(available_phases))
        hint = _make_hint(phase_actions)

        next_phase = available_phases[i + 1] if i + 1 < len(available_phases) else None
        on_next    = f"{scenario['id']}_{next_phase}" if next_phase else None

        nodes[node_id] = QuestionNode(
            question_id   = node_id,
            base_question = phase_name,   # phase name used as key into variant pool
            hint          = hint,
            difficulty    = difficulty,
            phase         = phase_name,
            domain        = domain,
            expected      = phase_actions or winning[:2],
            wrong         = bad,
            on_correct    = on_next,
            on_critical   = on_next,
            on_wrong      = retry_id,
        )

        nodes[retry_id] = QuestionNode(
            question_id   = retry_id,
            base_question = phase_name,
            hint          = hint + "\n\n💡 Check the available actions in the scenario brief.",
            difficulty    = max(0, difficulty - 1),
            phase         = phase_name,
            domain        = domain,
            expected      = phase_actions or winning[:2],
            wrong         = bad,
            on_correct    = on_next,
            on_critical   = on_next,
            on_wrong      = None,     # LLM dynamic question after 2nd wrong
        )

    return nodes


def get_start_node(scenario: dict, nodes: dict) -> str:
    for p in PHASE_ORDER:
        nid = f"{scenario['id']}_{p}"
        if nid in nodes:
            return nid
    return next(iter(nodes))


def next_node_id(current_node: QuestionNode, verdict: str) -> Optional[str]:
    if verdict in (VERDICT_CORRECT, VERDICT_CRITICAL):
        return current_node.on_correct
    if verdict == VERDICT_WRONG:
        return current_node.on_wrong
    if verdict == VERDICT_PREREQ:
        return current_node.question_id
    return current_node.on_correct   # neutral → gentle progress


# ── Helpers ────────────────────────────────────────────────────────────────────

def _detect_domain(scenario: dict) -> str:
    role = scenario.get("role", "")
    sid  = scenario.get("id", "")
    if "security" in role or any(k in sid for k in ["ransomware","breach","attack","supply","mfa"]):
        return "security"
    if "comms" in role or any(k in sid for k in ["crisis","backlash","recall","dieselgate","boeing","ghc","pepsi","united","volkswagen"]):
        return "pr"
    return "swe"


def _phase_to_difficulty(phase: str) -> int:
    return {
        "detection":     1,
        "investigation": 2,
        "escalation":    3,
        "false_recovery":2,
        "catastrophe":   4,
        "mitigation":    2,
        "recovery":      1,
    }.get(phase, 2)


def _slice_actions_for_phase(mitigation: list, idx: int, total: int) -> list[str]:
    if not mitigation:
        return []
    chunk = max(1, len(mitigation) // total)
    start = idx * chunk
    end   = start + chunk if idx < total - 1 else len(mitigation)
    return mitigation[start:end]


def _make_hint(expected_actions: list[str]) -> str:
    if not expected_actions:
        return "Think about the most at-risk system."
    first_word = expected_actions[0].split()[0]
    return f"Consider commands starting with `{first_word}...`"
