"""
evaluator.py — Dual-Path Semantic Command Evaluator.

Tier 1 (Fast Path - Free): Local keyword and semantic intent matching.
                           Accepts human variations (e.g. 'kill contractor' matches
                           'vpn-session-manager terminate --user contractor.user@uber.com')
                           instantly without calling LLM.

Tier 2 (Dynamic Path - AI): Fallback to LLM router for custom, out-of-box commands.
                            Simulates realistic terminal stdout/stderr on-the-fly.
"""

from __future__ import annotations
import re
import json
from typing import Optional, Dict, Any, List
from .llm_router import llm_router

VERDICT_CRITICAL = "critical"
VERDICT_CORRECT  = "correct"
VERDICT_WRONG    = "wrong"
VERDICT_NEUTRAL  = "neutral"
VERDICT_PREREQ   = "prereq"

# ── Local Semantic Intent Dictionaries ───────────────────────────────────────
# Maps target action intent verbs to their common synonyms.
VERB_SYNONYMS: Dict[str, set[str]] = {
    "terminate": {"terminate", "kill", "stop", "end", "revoke", "close", "disconnect", "suspend", "block"},
    "block": {"block", "drop", "deny", "filter", "isolate", "sever", "decouple", "quarantine"},
    "rotate": {"rotate", "change", "update", "reset", "regenerate"},
    "rollback": {"rollback", "revert", "undo", "restore"},
    "restart": {"restart", "reboot", "refresh"},
    "apologize": {"apologize", "sorry", "regret", "remorse", "statement", "release", "admit", "press"}
}

STOP_WORDS = {"the", "and", "for", "with", "from", "using", "sudo", "please", "now", "api"}

def _detect_domain(scenario: dict) -> str:
    role = scenario.get("role", "")
    sid  = scenario.get("id", "")
    if "security" in role or any(k in sid for k in ["ransomware", "breach", "attack", "supply", "mfa"]):
        return "security"
    if "comms" in role or any(k in sid for k in ["crisis", "backlash", "recall", "dieselgate", "boeing", "ghc", "pepsi", "united", "volkswagen"]):
        return "pr"
    return "swe"

def _normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text.strip().lower())

def _clean_tokens(text: str) -> set[str]:
    """Strips command flags (--user, -p), punctuation, and common shell stop words."""
    cleaned = re.sub(r'-+[a-zA-Z0-9_-]+', '', text)
    cleaned = re.sub(r'[^\w\s]', ' ', cleaned)
    tokens = {w for w in cleaned.lower().split() if len(w) > 2}
    return tokens - STOP_WORDS

def _fuzzy_intent_match(user_cmd: str, expected_action: str) -> bool:
    """
    Checks if the user's command matches the semantic intent of the expected action.
    Succeeds if they provide a synonym verb + at least one key noun target.
    """
    user_tokens = _clean_tokens(user_cmd)
    expected_tokens = _clean_tokens(expected_action)
    
    if not user_tokens or not expected_tokens:
        return False

    # Find if any verbs or their synonyms match
    verb_matched = False
    for exp_token in expected_tokens:
        for verb, synonyms in VERB_SYNONYMS.items():
            if exp_token in synonyms or exp_token == verb:
                # If this is an expected verb, check if user provided any of its synonyms
                if any(ut in synonyms for ut in user_tokens):
                    verb_matched = True
                    break

    # If the exact words overlap, or a synonym verb + a key noun match
    direct_overlap = user_tokens.intersection(expected_tokens)
    
    # Require at least a verb match and one noun match, or a high percentage of token overlap
    if verb_matched and len(direct_overlap) >= 1:
        return True
    if len(direct_overlap) / len(expected_tokens) >= 0.5:
        return True
        
    return False

def _lookup_output(command: str, scenario: dict) -> Optional[str]:
    outputs = scenario.get("scenario_specific_outputs", {})
    for key, value in outputs.items():
        if _fuzzy_intent_match(command, key):
            if isinstance(value, dict):
                return value.get("output", "")
            return str(value)
    return None

def _generate_domain_success_output(command: str, scenario: dict) -> str:
    domain = _detect_domain(scenario)
    title = scenario.get("title", "system")
    service = scenario.get("service", "subsystem")
    
    if domain == "pr":
        # Dynamic, rich reporter / outlet reactions
        import random
        statements = [
            f"Press Release Bulletin // Statement published successfully.\n"
            f"Media Outreach: Regional news wires have logged our official mitigation responses to the "
            f"'{title}' crisis. Outrage indices are beginning to respond to this posture.",
            f"Official Broadcast: Statement released.\n"
            f"Public Relations Syndicate: Corporate statement recorded. Regional stakeholders report: "
            f"'Apologies and policy adjustments are active. Continuing timeline evaluation.'"
        ]
        return random.choice(statements)
    elif domain == "security":
        # Security logs
        return (
            f"[SOC-SYS] Action logged: '{command}'\n"
            f"PERIPHERAL STATUS: MITIGATED // Security policy update applied successfully to {service}.\n"
            f"Connection pools and threat containment metrics showing positive stabilization coefficient."
        )
    else:
        # SRE terminal stdout
        return (
            f"[SYSTEMCTL] Service '{service}' configuration reloaded.\n"
            f"Worker processes bound successfully // Port allocations active.\n"
            f"Diagnostic log: 200 OK. Metric telemetry polling fully re-established."
        )

def _get_advisor_message(command: str, scenario: dict) -> Optional[str]:
    outputs = scenario.get("scenario_specific_outputs", {})
    for key, value in outputs.items():
        if _fuzzy_intent_match(command, key):
            if isinstance(value, dict):
                return value.get("advisor")
    return None

def _check_prerequisites(command: str, session_completed: List[str], scenario: dict) -> bool:
    domain = _detect_domain(scenario)
    prereqs_map = scenario.get("intent_prerequisites", {})
    scoring = scenario.get("scoring", {})
    all_valid_actions = (
        scenario.get("possibleActions", []) + 
        scoring.get("winning_actions", []) + 
        scenario.get("mitigation_path", [])
    )
    
    for intent_key, required_actions in prereqs_map.items():
        if intent_key in _normalise(command):
            for req_act in required_actions:
                if not req_act:
                    continue
                # If this prerequisite action isn't even possible in this scenario's domain/action list, skip it!
                # For non-SWE domains, we also don't want SWE-specific infrastructure prerequisites.
                if domain != "swe" and intent_key in ("restart", "rollback", "failover", "kill"):
                    continue
                
                # Check if the prerequisite command is even defined in this scenario
                exists_in_scenario = any(_fuzzy_intent_match(act, req_act) for act in all_valid_actions)
                if not exists_in_scenario:
                    continue
                    
                # Now check if it has been completed
                if not any(_fuzzy_intent_match(done, req_act) for done in session_completed):
                    return False
    return True

# ─── Main Evaluator ──────────────────────────────────────────────────────────

def evaluate_command(command: str, scenario: dict, session_completed: List[str]) -> dict:
    scoring    = scenario.get("scoring", {})
    winning    = scoring.get("winning_actions", scenario.get("possibleActions", []))
    bad        = scoring.get("bad_actions", scenario.get("wrongActions", []))
    critical   = scoring.get("critical_actions", [])
    mitigation = scenario.get("mitigation_path", [])
    consequences = scenario.get("incorrect_action_consequences", {})

    cmd_lower = command.lower()

    # Helper function to compute dynamic metrics for local match verdicts
    def get_local_verdict_impacts(verdict: str, points: int) -> dict:
        if verdict == VERDICT_PREREQ:
            return {
                "scoreImpact": -5,
                "blastRadiusImpact": 5,
                "recoveryDelay": 2,
                "confidenceImpact": -3
            }
        elif verdict == VERDICT_WRONG:
            # Command-specific dangerous action evaluation
            if "drain" in cmd_lower or "traffic" in cmd_lower:
                return {
                    "scoreImpact": -20,
                    "blastRadiusImpact": 20,
                    "recoveryDelay": 8,
                    "confidenceImpact": -12
                }
            elif "shutdown" in cmd_lower or "stop" in cmd_lower or "kill" in cmd_lower or "terminate" in cmd_lower or "rm " in cmd_lower:
                return {
                    "scoreImpact": -25,
                    "blastRadiusImpact": 25,
                    "recoveryDelay": 10,
                    "confidenceImpact": -15
                }
            elif "drop" in cmd_lower or "delete" in cmd_lower:
                return {
                    "scoreImpact": -30,
                    "blastRadiusImpact": 30,
                    "recoveryDelay": 12,
                    "confidenceImpact": -20
                }
            else:
                return {
                    "scoreImpact": -25,
                    "blastRadiusImpact": 20,
                    "recoveryDelay": 8,
                    "confidenceImpact": -15
                }
        elif verdict == VERDICT_CRITICAL:
            if "logs" in cmd_lower or "describe" in cmd_lower or "diagnose" in cmd_lower or "grep" in cmd_lower or "cat " in cmd_lower:
                return {
                    "scoreImpact": 10,
                    "blastRadiusImpact": -5,
                    "recoveryDelay": 0,
                    "confidenceImpact": 5
                }
            elif "rollback" in cmd_lower or "revert" in cmd_lower or "undo" in cmd_lower:
                return {
                    "scoreImpact": 8,
                    "blastRadiusImpact": -10,
                    "recoveryDelay": 0,
                    "confidenceImpact": 8
                }
            else:
                return {
                    "scoreImpact": 30,
                    "blastRadiusImpact": -20,
                    "recoveryDelay": 0,
                    "confidenceImpact": 15
                }
        elif verdict == VERDICT_CORRECT:
            if "logs" in cmd_lower or "describe" in cmd_lower or "diagnose" in cmd_lower or "grep" in cmd_lower or "cat " in cmd_lower:
                return {
                    "scoreImpact": 5,
                    "blastRadiusImpact": -2,
                    "recoveryDelay": 0,
                    "confidenceImpact": 4
                }
            elif "rollback" in cmd_lower or "revert" in cmd_lower or "undo" in cmd_lower:
                return {
                    "scoreImpact": 8,
                    "blastRadiusImpact": -10,
                    "recoveryDelay": 0,
                    "confidenceImpact": 8
                }
            else:
                return {
                    "scoreImpact": 10,
                    "blastRadiusImpact": -10,
                    "recoveryDelay": 0,
                    "confidenceImpact": 8
                }
        else: # Neutral
            return {
                "scoreImpact": -2,
                "blastRadiusImpact": 0,
                "recoveryDelay": 1,
                "confidenceImpact": -1
            }

    # 1. Prerequisite Checklist (Pure Python)
    if not _check_prerequisites(command, session_completed, scenario):
        impacts = get_local_verdict_impacts(VERDICT_PREREQ, -5)
        return {
            "verdict":            VERDICT_PREREQ,
            "terminal_output":    "ERROR: Command execution blocked. Unresolved prerequisite tasks identified.",
            "advisor_msg":        "Complete earlier prerequisite playbook steps first.",
            "consequence":        None,
            "points":             impacts["scoreImpact"],
            "scoreImpact":        impacts["scoreImpact"],
            "blastRadiusImpact":   impacts["blastRadiusImpact"],
            "recoveryDelay":      impacts["recoveryDelay"],
            "confidenceImpact":   impacts["confidenceImpact"],
            "is_mitigation_step": False,
        }

    # 2. TIER 1: FAST PATH - Local Semantic Intent Matching (Pure Python)
    # Check Bad Actions
    for bad_act in bad:
        if _fuzzy_intent_match(command, bad_act):
            consequence = None
            for key, msg in consequences.items():
                if _fuzzy_intent_match(command, key):
                    consequence = msg
                    break
            terminal_output = _lookup_output(command, scenario)
            impacts = get_local_verdict_impacts(VERDICT_WRONG, -20)
            return {
                "verdict":            VERDICT_WRONG,
                "terminal_output":    terminal_output or f"ERROR: '{command}' triggered systemic errors.",
                "advisor_msg":        _get_advisor_message(command, scenario) or "That was a dangerous or incorrect action.",
                "consequence":        consequence or "Cascading degradation risk increased.",
                "points":             impacts["scoreImpact"],
                "scoreImpact":        impacts["scoreImpact"],
                "blastRadiusImpact":   impacts["blastRadiusImpact"],
                "recoveryDelay":      impacts["recoveryDelay"],
                "confidenceImpact":   impacts["confidenceImpact"],
                "is_mitigation_step": False,
            }

    # Check Critical Actions
    for crit_act in critical:
        if _fuzzy_intent_match(command, crit_act):
            impacts = get_local_verdict_impacts(VERDICT_CRITICAL, 30)
            return {
                "verdict":            VERDICT_CRITICAL,
                "terminal_output":    _lookup_output(command, scenario) or _generate_domain_success_output(command, scenario),
                "advisor_msg":        _get_advisor_message(command, scenario) or "Excellent decision. That has mitigated a major risk.",
                "consequence":        None,
                "points":             impacts["scoreImpact"],
                "scoreImpact":        impacts["scoreImpact"],
                "blastRadiusImpact":   impacts["blastRadiusImpact"],
                "recoveryDelay":      impacts["recoveryDelay"],
                "confidenceImpact":   impacts["confidenceImpact"],
                "is_mitigation_step": _fuzzy_intent_match(command, next(iter(mitigation), "")),
            }

    # Check Standard Winning Actions
    for win_act in winning:
        if _fuzzy_intent_match(command, win_act):
            impacts = get_local_verdict_impacts(VERDICT_CORRECT, 10)
            return {
                "verdict":            VERDICT_CORRECT,
                "terminal_output":    _lookup_output(command, scenario) or _generate_domain_success_output(command, scenario),
                "advisor_msg":        _get_advisor_message(command, scenario) or "Good step. Keep working through the playbooks.",
                "consequence":        None,
                "points":             impacts["scoreImpact"],
                "scoreImpact":        impacts["scoreImpact"],
                "blastRadiusImpact":   impacts["blastRadiusImpact"],
                "recoveryDelay":      impacts["recoveryDelay"],
                "confidenceImpact":   impacts["confidenceImpact"],
                "is_mitigation_step": _fuzzy_intent_match(command, next(iter(mitigation), "")),
            }

    # 3. TIER 2: DYNAMIC PATH - Fallback to LLM Game Master
    domain = _detect_domain(scenario)
    
    sys_prompt = f"""
    You are the secure kernel execution sandbox for an incident response simulator called CRISULATOR.
    Scenario Title: {scenario.get('title')}
    Scenario Brief: {scenario.get('brief')}
    Domain: {domain}

    The user typed this command into the terminal: '{command}'

    Your task is to act as the OS kernel/Game Master. Evaluate if this command is a realistic, useful, or dangerous action for this specific incident.
    
    You must evaluate the following metrics for this action:
    - scoreImpact: integer between -30 and +30. Correct/critical diagnostic or mitigation step gets positive points (+5 to +30). Irrelevant/neutral wastes time (-1 to -5). Dangerous/incorrect gets negative points (-10 to -30).
    - blastRadiusImpact: integer between -25 and +25. Correct actions contain/reduce blast radius (negative impact). Dangerous actions increase it (positive impact).
    - recoveryDelay: integer between 0 and 15 (minutes of downtime delay caused).
    - confidenceImpact: integer between -20 and +20 (change in stakeholder trust/confidence).

    You must return a valid JSON object with EXACTLY these keys (and no other text or explanation outside the JSON):
    {{
      "terminal_output": "The simulated realistic stdout/stderr of this command",
      "verdict": "correct" | "critical" | "wrong" | "neutral",
      "scoreImpact": <int>,
      "blastRadiusImpact": <int>,
      "recoveryDelay": <int>,
      "confidenceImpact": <int>,
      "advisor_msg": "A brief 1-sentence helpful feedback or warning message",
      "consequence": "If the command was wrong, a brief description of the negative consequence. Otherwise null"
    }}
    """
    
    user_msg = f"Evaluate command: '{command}'."
    raw_response = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=220)
    
    if raw_response:
        try:
            # Secure JSON extractor block (avoids markdown fence errors)
            match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            clean_res = match.group(0) if match else raw_response.strip()
            
            result = json.loads(clean_res)
            verdict = result.get("verdict", VERDICT_NEUTRAL)
            score_imp = int(result.get("scoreImpact", result.get("points", 0)))
            
            # Fallback for metrics if LLM didn't return them
            fallback_metrics = get_local_verdict_impacts(verdict, score_imp)
            blast_radius_imp = int(result.get("blastRadiusImpact", fallback_metrics["blastRadiusImpact"]))
            rec_delay = int(result.get("recoveryDelay", fallback_metrics["recoveryDelay"]))
            conf_imp = int(result.get("confidenceImpact", fallback_metrics["confidenceImpact"]))

            return {
                "verdict":            verdict,
                "terminal_output":    result.get("terminal_output", f"$ {command}\nExecuted."),
                "advisor_msg":        result.get("advisor_msg", "Neutral operational outcome."),
                "consequence":        result.get("consequence"),
                "points":             score_imp,
                "scoreImpact":        score_imp,
                "blastRadiusImpact":   blast_radius_imp,
                "recoveryDelay":      rec_delay,
                "confidenceImpact":   conf_imp,
                "is_mitigation_step": False
            }
        except Exception as e:
            # Silent fallback to standard neutral output if JSON parsing fails
            pass

    # Generic Local Fallback (if LLM is offline)
    fallback_metrics = get_local_verdict_impacts(VERDICT_NEUTRAL, 0)
    return {
        "verdict":            VERDICT_NEUTRAL,
        "terminal_output":    f"$ {command}\nCommand completed. No significant system change detected.",
        "advisor_msg":        "Telemetry indicators remain stable.",
        "consequence":        None,
        "points":             fallback_metrics["scoreImpact"],
        "scoreImpact":        fallback_metrics["scoreImpact"],
        "blastRadiusImpact":   fallback_metrics["blastRadiusImpact"],
        "recoveryDelay":      fallback_metrics["recoveryDelay"],
        "confidenceImpact":   fallback_metrics["confidenceImpact"],
        "is_mitigation_step": False,
    }


def check_win_condition(session_completed: List[str], scenario: dict) -> bool:
    scoring    = scenario.get("scoring", {})
    critical   = scoring.get("critical_actions", [])
    mitigation = scenario.get("mitigation_path", [])
    targets    = critical if critical else mitigation
    if not targets:
        return False
    return all(any(_fuzzy_intent_match(done, t) for done in session_completed) for t in targets)


def check_lose_condition(score: int, wrong_count: int) -> bool:
    return score < -40 or wrong_count >= 5