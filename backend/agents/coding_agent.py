"""
coding_agent.py — Adaptive coding sandbox agent.

HYBRID ARCHITECTURE:
════════════════════
Tier 1 (FREE, instant):     Pre-authored variant pool  → question_variants.py
Tier 2 (FREE, instant):     Template mutation          → question_variants.py
Tier 3 (LLM, rate-limited): Novel dynamic questions    → llm_router.py

LLM call budget per session: 10 calls max
LLM providers (auto-rotated): Groq → Gemini → Local Llama → OpenRouter

NON-REPETITION GUARANTEE:
  variant_seed = hash(room_id + user_id + node_id)
  → Same node, different user/room → different question text
  → Same user replaying → same question (session consistency)
  → After wrong answer → different follow-up angle
"""

from __future__ import annotations
import json, os, sys
from typing import Optional

from .evaluator         import evaluate_command, check_win_condition, check_lose_condition
from .question_graph    import build_graph, get_start_node, next_node_id, QuestionNode
from .question_variants import get_variant_question, get_followup_question
from .session_manager   import session_manager, AgentSession
from .llm_router        import llm_router
# Add these at the top of backend/agents/coding_agent.py
from .timeline_recorder import timeline_recorder
from .siem_agent import siem_agent
from .attacker_agent import attacker_agent
from .forensics_agent import forensics_agent
from .journalist_agent import journalist_agent
from .legal_counsel_agent import legal_counsel_agent
from .social_sentiment_agent import social_sentiment_agent
from .booth_coordinator_agent import booth_coordinator_agent
from .question_graph import _detect_domain

# ── Scenario loader ───────────────────────────────────────────────────────────

_SCENARIO_CACHE: dict[str, dict] = {}

def load_scenario(scenario_id: str) -> Optional[dict]:
    if scenario_id in _SCENARIO_CACHE:
        return _SCENARIO_CACHE[scenario_id]

    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    for domain in ["swe", "cybersecurity", "pr"]:
        path = os.path.join(backend_root, "scenarios", domain, f"{scenario_id}.json")
        if os.path.exists(path):
            with open(path) as f:
                data = json.load(f)
            _SCENARIO_CACHE[scenario_id] = data
            return data
    return None


# ── LLM prompt builders ───────────────────────────────────────────────────────

def _agent_system_prompt(scenario: dict, agent: dict) -> str:
    personalities = scenario.get("stakeholder_personalities", {})
    name  = agent.get("name", "Agent")
    role  = agent.get("role", "Colleague")
    persona = personalities.get(name, personalities.get(role, {}))
    style   = persona.get("style", "professional") if isinstance(persona, dict) else str(persona)
    focus   = persona.get("focus", "resolving the incident") if isinstance(persona, dict) else ""
    return (
        f"You are {name}, the {role}. Style: {style}. Focus: {focus}.\n"
        f"Scenario: {scenario.get('title')} — {scenario.get('brief','')}\n"
        f"RULES: Stay in character. Max 2 sentences. "
        f"React to what the user just did. Never reveal the correct answer. "
        f"Severity: {scenario.get('severity','SEV1')}."
    )


def _dynamic_question_prompt(scenario: dict, session: AgentSession) -> str:
    recent = session.completed_actions[-3:]
    domain = _detect_domain(scenario)
    if domain == "pr":
        return (
            f"You are a tough, skeptical investigative journalist or an extremely stressed corporate board member reacting to a public relations disaster: {scenario.get('title')}.\n"
            f"The VP of Communications just announced / executed: {', '.join(recent)}.\n"
            f"Generate ONE highly intense, challenging follow-up question or press inquiry. "
            f"Throw in realistic crisis challenges—confront them directly about public outrage, brand integrity, legal liability, or sponsor boycotts. "
            f"Make it realistic, demanding, and direct. Max 2 sentences. Do NOT give the answer."
        )
    elif domain == "security":
        return (
            f"You are a senior Lead Security Architect during a major cyber breach: {scenario.get('title')}.\n"
            f"The cybersecurity responder just executed: {', '.join(recent)}.\n"
            f"Generate ONE urgent, novel threat intelligence challenge about SCADA scans, Indicators of Compromise (IOCs), credential leakage, or network containment gaps.\n"
            f"Max 2 sentences. Do NOT give the answer."
        )
    return (
        f"You are a senior technical interviewer for a distributed systems outage: {scenario.get('title')}.\n"
        f"The primary on-call SRE just completed: {', '.join(recent)}.\n"
        f"Generate ONE novel engineering challenge about edge cases, rollback risks, container restarts, or database connection pool limits.\n"
        f"Max 2 sentences. Do NOT give the answer."
    )


def _debrief_prompt(scenario: dict, session: AgentSession) -> str:
    s = session.performance_summary()
    return (
        f"Senior incident response mentor. Scenario: {scenario.get('title')}.\n"
        f"Write a 3-sentence debrief: what they did well, what to improve.\n"
        f"Score: {s['score']}, Accuracy: {s['accuracy']}%, Outcome: {s['outcome']}."
    )


# ── Main agent ────────────────────────────────────────────────────────────────

class CodingAgent:

    def start_session(
        self,
        scenario_id: str,
        user_id:     str,
        room_id:     str = "default",
    ) -> dict:
        scenario = load_scenario(scenario_id)
        if not scenario:
            return {"error": f"Scenario '{scenario_id}' not found."}

        graph      = build_graph(scenario)
        start_id   = get_start_node(scenario, graph)
        session    = session_manager.create_session(scenario_id, user_id, room_id, start_id)
        start_node = graph[start_id]
        session.mark_node_seen(start_id)

        # First question — Tier 1/2 variant (no LLM needed)
        first_question = get_variant_question(
            phase    = start_node.phase,
            scenario = scenario,
            room_id  = room_id,
            user_id  = user_id,
            node_id  = start_id,
        )

        agents = scenario.get("agents", [])
        # Initialize timeline recording
        timeline_recorder.start_recording(
            session.session_id, 
            scenario_id, 
            {
                "initial_logs": scenario.get("initialLogs", scenario.get("initial_logs", [])),
                "score": 100,
                "phase": start_node.phase
            }
        )

        # Generate initial dynamic PR options
        options = self._generate_pr_options(scenario, session, first_question)

        agents = scenario.get("agents", [])
        return {
            "session_id":     session.session_id,
            "scenario_id":    scenario_id,
            "title":          scenario.get("title"),
            "severity":       scenario.get("severity"),
            "brief":          scenario.get("brief"),
            "objectives":     scenario.get("objectives", []),
            "initial_logs":   scenario.get("initialLogs", scenario.get("initial_logs", [])),
            "agent_messages": [{"name": a["name"], "role": a["role"], "message": a["message"]} for a in agents],
            "question":       first_question,
            "phase":          start_node.phase,
            "difficulty":     start_node.difficulty,
            "node_id":        start_id,
            "score":          100,
            "options":        options,
        }

    def submit_answer(
        self,
        session_id:  str,
        command:     str,
        node_id:     str,
        scenario_id: str,
    ) -> dict:
        session = session_manager.get_session(session_id)
        if not session:
            return {"error": "Session not found or expired."}

        scenario = load_scenario(scenario_id)
        if not scenario:
            return {"error": "Scenario not found."}

        graph = build_graph(scenario)

        # ── 1. Evaluate (pure Python) ─────────────────────────────────────────
        eval_result = evaluate_command(command, scenario, session.completed_actions)
        verdict     = eval_result["verdict"]
        points      = eval_result["points"]
        
        # Sync continuous time-based logs first
        session.append_live_logs()
        
        session.record_action(
            command=command,
            verdict=verdict,
            points=points,
            scoreImpact=eval_result.get("scoreImpact", points),
            blastRadiusImpact=eval_result.get("blastRadiusImpact", 0),
            recoveryDelay=eval_result.get("recoveryDelay", 0),
            confidenceImpact=eval_result.get("confidenceImpact", 0),
            feedback=eval_result.get("consequence", eval_result.get("advisor_msg", ""))
        )

        # ── Spontaneous Agent Events & Dynamics ──────────────────────────────
        domain = _detect_domain(scenario)
        spontaneous_events = []
        
        if domain == "security":
            # Attacker advances if the user is struggling or slow
            attacker_action = attacker_agent.advance_attacker(
                session.session_id, scenario_id, session.completed_actions, session.total_questions
            )
            if attacker_action:
                spontaneous_events.append(attacker_action)
                session.modify_score_delta(-attacker_action["metric_impact_delta"], "attacker_action")
            
            # SIEM trigger
            siem_action = siem_agent.trigger_distraction(scenario_id, session.total_questions)
            if siem_action:
                spontaneous_events.append(siem_action)
                
        elif domain == "pr":
            # Live social media ticking
            sentiment_action = social_sentiment_agent.process_sentiment_tick(
                session.session_id, scenario, verdict, session.total_questions
            )
            if sentiment_action:
                spontaneous_events.append(sentiment_action)
                sentiment_penalty = (100 - sentiment_action["public_trust_score"]) // 10
                session.modify_score_delta(-sentiment_penalty, "social_sentiment")
            
            # Legal counsel reviews statements for liability risks
            legal_action = legal_counsel_agent.evaluate_liability_risk(command, scenario.get("title", ""))
            if legal_action["unsafe_statements_flag"]:
                spontaneous_events.append({
                    "type": "legal_warning",
                    "message": legal_action["counsel_formal_warning"]
                })
                session.modify_score_delta(-(legal_action["liability_exposure_index"] // 2), "legal_warning")
            
            # Booth coordination pressures (GHC specific)
            booth_action = booth_coordinator_agent.evaluate_booth_pressure(
                session.session_id, scenario_id, verdict, command
            )
            if booth_action:
                spontaneous_events.append(booth_action)

        # Record step into Replay Timeline
        timeline_recorder.record_event(
            session_id=session_id,
            command=command,
            verdict=verdict,
            points=points,
            phase=session.current_phase,
            terminal_output=eval_result["terminal_output"],
            metrics_snapshot={"score": session.score}
        )

        # ── 2. Win / lose check (pure Python) ────────────────────────────────
        won  = check_win_condition(session.completed_actions, scenario)
        lost = check_lose_condition(session.score, session.wrong_count)
        if won:
            session.is_complete = True
            session.outcome     = "win"
        elif lost:
            session.is_complete = True
            session.outcome     = "lose"

        # ── 3. Next node + question ───────────────────────────────────────────
        current_node = graph.get(node_id)
        next_q_text  = None
        next_nid     = None
        next_phase   = session.current_phase
        next_diff    = 2
        hint_text    = None

        if not session.is_complete and current_node:
            next_nid      = next_node_id(current_node, verdict)
            next_node_obj = graph.get(next_nid) if next_nid else None

            if next_node_obj:
                # Advance phase tracking
                if next_node_obj.phase != session.current_phase:
                    session.advance_phase(next_node_obj.phase)
                session.mark_node_seen(next_nid)

                next_phase = next_node_obj.phase
                next_diff  = next_node_obj.difficulty

                # ── TIER 1/2: Variant question (free, instant) ────────────────
                next_q_text = get_variant_question(
                    phase       = next_node_obj.phase,
                    scenario    = scenario,
                    room_id     = session.room_id,
                    user_id     = session.user_id,
                    node_id     = next_nid,
                    verdict     = verdict,
                    consequence = eval_result.get("consequence"),
                )

                # Append a follow-up probe (pure Python, different per user)
                followup = get_followup_question(
                    verdict  = verdict,
                    room_id  = session.room_id,
                    user_id  = session.user_id,
                    node_id  = next_nid,
                    answered = session.completed_actions,
                )
                next_q_text = f"{next_q_text}\n\n💬 Follow-up: {followup}"

                if verdict == "wrong":
                    hint_text = next_node_obj.hint

            else:
                # Graph exhausted — TIER 3: LLM dynamic question
                if session.can_call_llm():
                    session.use_llm_call()
                    sys_p = _dynamic_question_prompt(scenario, session)
                    llm_q = llm_router.generate_sync(sys_p, "Generate next challenge.", max_tokens=120)
                    next_q_text = llm_q if llm_q else self._static_final_question(scenario)
                else:
                    next_q_text = self._static_final_question(scenario)

        # ── 4. Agent reaction ─────────────────────────────────────────────────
        agent_reaction = self._agent_reaction(scenario, session, command, eval_result, verdict)

        # ── 5. Evolving log (pure Python) ─────────────────────────────────────
        evolving_logs = scenario.get("evolving_logs", [])
        log_entry = None
        if evolving_logs:
            idx = min(session.wrong_count + session.total_questions // 2, len(evolving_logs) - 1)
            log_entry = evolving_logs[idx]

        # ── Build response ────────────────────────────────────────────────────
        response = {
            "verdict":            verdict,
            "terminal_output":    eval_result["terminal_output"],
            "advisor_message":    eval_result.get("advisor_msg"),
            "consequence":        eval_result.get("consequence"),
            "points":             points,
            "score":              session.score,
            "wrong_count":        session.wrong_count,
            "phase":              session.current_phase,
            "is_complete":        session.is_complete,
            "logs":               session.logs,
            "outcome":            session.outcome,
            "evolving_log":       log_entry,
            "agent_reaction":     agent_reaction,
            "is_mitigation_step": eval_result.get("is_mitigation_step", False),
            "spontaneous_events": spontaneous_events,  # Dynamic event feeds
        }

        if not session.is_complete:
            response["next_question"] = next_q_text
            response["next_node_id"]  = next_nid
            response["next_phase"]    = next_phase
            response["next_difficulty"] = next_diff
            response["hint"]          = hint_text
            
            # Fetch dynamic option cards matching the new reuters inquiry and reputation indices
            response["options"]       = self._generate_pr_options(scenario, session, next_q_text)
        else:
            response["summary"]      = session.performance_summary()
            response["win_message"]  = scenario.get("winCondition")  if won  else None
            response["lose_message"] = scenario.get("loseCondition") if lost else None
            
            # Generate final forensic report at the end of a security scenario
            if domain == "security":
                forensics_report = forensics_agent.analyze_command_hygiene(
                    session.completed_actions, scenario.get("title", "")
                )
                response["summary"]["forensics_report"] = forensics_report
            
            if session.can_call_llm():
                session.use_llm_call()
                response["debrief"] = llm_router.generate_sync(
                    _debrief_prompt(scenario, session),
                    "Generate debrief.",
                    max_tokens=150,
                ) or "Session complete. Review your action history above."
                
            # Cleanup dynamic session states
            attacker_agent.clear_session(session_id)
            social_sentiment_agent.clear_session(session_id)
            booth_coordinator_agent.clear_session(session_id)
            journalist_agent.clear_session(session_id)
            timeline_recorder.clear_recording(session_id)

        return response

    def _generate_pr_options(self, scenario: dict, session: AgentSession, current_question: str) -> list:
        # Check if the domain is indeed PR
        if _detect_domain(scenario) != "pr":
            return []
            
        trust = social_sentiment_agent.get_trust(session.session_id)
        outrage = 100 - trust
        legal_risk = session.recovery_delay * 5 + (100 - session.confidence_rating) // 2
        legal_risk = max(0, min(100, legal_risk))
        
        # Fallback static options in case LLM is offline or JSON parsing fails
        import random
        scenario_id = scenario.get("id", "")
        fallback_map = {
            "united_airlines_crisis": [
                { "label": "Draft Holding Statement", "command": "hold statement", "action": "Draft an official holding statement to acknowledge viral video.", "risk": "Low Risk", "hint": "RECOMMENDED: Acknowledges concern while legal gathers facts." },
                { "label": "Stand by Wording", "command": "Stand by the 're-accommodate' statement", "action": "Stand by the initial statement apologizing for re-accommodating passenger.", "risk": "High Risk", "hint": "WARNING: High risk of escalating media outrage and stock plunge." },
                { "label": "Issue Sincere Apology", "command": "Issue profound apology", "action": "Issue a profound and direct public apology from the CEO.", "risk": "Low Risk", "hint": "RECOMMENDED: Essential first-step to stabilize public sentiment." },
                { "label": "Blame Aviation Police", "command": "Blame aviation police", "action": "Shift the responsibility to airport aviation police forces.", "risk": "High Risk", "hint": "WARNING: Seen as corporate blame shifting; accelerates outrage." },
                { "label": "Announce Policy Reform", "command": "Announce policy change on overbooking", "action": "Announce dynamic overbooking review and ticket reform.", "risk": "Low Risk", "hint": "RECOMMENDED: Resolves structural root cause to rebuild trust." },
                { "label": "Fire the CEO", "command": "Fire the CEO immediately", "action": "Request board of directors to dismiss the CEO.", "risk": "Medium Risk", "hint": "Balances severe governance changes with legal concerns." }
            ],
            "volkswagen_dieselgate": [
                { "label": "Cooperate with EPA", "command": "cooperate_with_regulators --meeting 'Joint statement with EPA'", "action": "Cooperate with clean air regulators and hold a joint statement.", "risk": "Low Risk", "hint": "RECOMMENDED: Secures legal transparency and regulatory alignment." },
                { "label": "Deny Deception Notice", "command": "deny_intentional_cheating --statement 'This was an isolated mistake.'", "action": "Formally deny Notice of Violation clean emissions claims.", "risk": "High Risk", "hint": "WARNING: Highly volatile; will double regulatory penalties." },
                { "label": "Admit Fault Fully", "command": "issue_press_release --message 'We admit fault and are taking full responsibility.'", "action": "Release public statement admitting defeat-device code use.", "risk": "Low Risk", "hint": "RECOMMENDED: Necessary to prevent wider criminal fraud charges." },
                { "label": "Blame Rogue Engineers", "command": "blame_engineers --names 'Rogue team members'", "action": "Blame specific developers for cheating software logic.", "risk": "High Risk", "hint": "WARNING: Deflects responsibility; triggers severe compliance backlash." },
                { "label": "Suspend Executives", "command": "suspend_executives --names 'CEO, CTO'", "action": "Immediately suspend CEO and engineering leadership.", "risk": "Medium Risk", "hint": "Establishes institutional accountability before board actions." },
                { "label": "Launch Recall Program", "command": "launch_recall_program --models 'affected diesel cars'", "action": "Begin a global clean emissions recall repair program.", "risk": "Low Risk", "hint": "RECOMMENDED: Active product remediation to restore consumer confidence." }
            ],
            "ghc_crisis": [
                { "label": "Acknowledge Flaws", "command": "draft holding statement", "action": "Draft a holding statement acknowledging registration anomalies.", "risk": "Low Risk", "hint": "RECOMMENDED: Calms community frustration during system audit." },
                { "label": "Defend GHC Policy", "command": "Stand by standard registration rules", "action": "Stand firm on GHC standard registration filters.", "risk": "High Risk", "hint": "WARNING: High risk of immediate corporate sponsor withdrawal." },
                { "label": "Apologize Sincerely", "command": "Issue profound apology", "action": "Release CEO sincere apology to all participants.", "risk": "Low Risk", "hint": "RECOMMENDED: Essential to retain attendee and academic trust." },
                { "label": "Blame Attendee Methods", "command": "Blame individual attendees for filtering bypass", "action": "Publicly call out male attendees bypassing registration filters.", "risk": "High Risk", "hint": "WARNING: Defensive shift; seen as host failure deflection." },
                { "label": "Announce System Audit", "command": "Announce policy change on overbooking", "action": "Announce deep engineering and filtering systems audit.", "risk": "Low Risk", "hint": "RECOMMENDED: Concrete commitment to secure GHC integrity." },
                { "label": "Brief CEO & Board", "command": "brief ceo", "action": "Provide a 5-sentence briefing note to CEO and directors.", "risk": "Medium Risk", "hint": "Aligns leadership ahead of media conferences." }
            ]
        }
        
        fallback_pool = fallback_map.get(scenario_id, [])
        if not fallback_pool:
            # Fallback dynamic cards from scenario actions if scenario is custom
            actions = scenario.get("possibleActions", []) + scenario.get("wrongActions", [])
            for act in actions:
                clean_lbl = act.replace("_", " ").replace("-", " ").title()
                is_wrong = act in scenario.get("wrongActions", [])
                risk = "High Risk" if is_wrong else "Low Risk"
                hint = f"WARNING: Critical risk action!" if is_wrong else "RECOMMENDED: Restores client confidence."
                fallback_pool.append({
                    "label": clean_lbl,
                    "command": act,
                    "action": f"Deploy the '{clean_lbl}' campaign to manage the current incident response.",
                    "risk": risk,
                    "hint": hint
                })
        
        # Build prompt for LLM call
        sys_p = f"""
        You are the GMAT Crisis Communications Coach for the scenario: {scenario.get('title')}.
        Current GMAT Phase: {session.current_phase}
        Current Reputation Index:
        - Public Trust: {trust}%
        - Public Outrage: {outrage}%
        - Legal Risk: {legal_risk}%
        
        Current Reuters/Media Inquiry: "{current_question}"
        Previous Actions Taken by candidate: {", ".join(session.completed_actions) or "None"}
        
        Your task is to generate EXACTLY TWO (2) highly context-aware, challenging public relations option cards that the candidate can choose from to respond to this Reuters inquiry.
        
        - One option should be a strategically sound, constructive, or transparent choice (usually Low or Medium Risk) that addresses the inquiry and helps rebuild trust.
        - One option should be a dangerous, high-risk, or evasive choice (High Risk) that shifts blame, denies liability, or ignores regulatory concerns, which will increase the difficulty or escalate the crisis.
        
        You must return a valid JSON list of EXACTLY 2 objects with this structure (no markdown formatting, no backticks, just raw JSON):
        [
          {{
            "label": "Brief 3-4 word title of action",
            "command": "lowercase_command_slug (e.g., coordinate legal, brief ceo, hold statement, issue apology)",
            "action": "1-sentence description of the strategic action",
            "risk": "Low Risk" | "Medium Risk" | "High Risk",
            "hint": "1-sentence advisory note explaining the potential impact or warning"
          }},
          {{
            "label": "Brief 3-4 word title of action",
            "command": "lowercase_command_slug (e.g., blame engineers, deny deception, fire ceo)",
            "action": "1-sentence description of the strategic action",
            "risk": "Low Risk" | "Medium Risk" | "High Risk",
            "hint": "1-sentence advisory note explaining the potential impact or warning"
          }}
        ]
        """
        
        if session.can_call_llm():
            try:
                session.use_llm_call()
                raw = llm_router.generate_sync(sys_p, "Generate 2 options.", max_tokens=250)
                import re, json
                match = re.search(r'\[.*\]', raw, re.DOTALL)
                clean_raw = match.group(0) if match else raw.strip()
                opts = json.loads(clean_raw)
                if isinstance(opts, list) and len(opts) == 2:
                    return opts
            except Exception as e:
                pass
                
        # Canned deterministic fallback when LLM is unavailable or failed to parse
        uncompleted = [o for o in fallback_pool if o["command"] not in session.completed_actions]
        if len(uncompleted) < 2:
            uncompleted = fallback_pool
            
        # Ensure we return at least one low/medium and one high risk if possible
        lows = [o for o in uncompleted if o["risk"] != "High Risk"]
        highs = [o for o in uncompleted if o["risk"] == "High Risk"]
        
        selected = []
        if lows: selected.append(random.choice(lows))
        if highs: selected.append(random.choice(highs))
        
        while len(selected) < 2 and uncompleted:
            c = random.choice(uncompleted)
            if c not in selected:
                selected.append(c)
                
        return selected[:2]

    def get_session_status(self, session_id: str) -> dict:
        session = session_manager.get_session(session_id)
        if not session:
            return {"error": "Session not found."}
        # Update live log ticks dynamically on every status poll
        session.append_live_logs()
        return session.performance_summary()

        if session.can_call_llm():
            session.use_llm_call()
            sys_p = (
                f"Socratic mentor for: {scenario.get('title')}.\n"
                f"User stuck on {node.phase if node else 'unknown'} phase.\n"
                f"Give a hint — guide without revealing the answer. Max 2 sentences."
            )
            usr_p = (
                f"I've tried: {', '.join(session.completed_actions[-2:]) or 'nothing yet'}. "
                f"Phase: {session.current_phase}."
            )
            llm_hint = llm_router.generate_sync(sys_p, usr_p, max_tokens=80)
            if llm_hint:
                return {"hint": llm_hint, "source": "llm",
                        "llm_calls_remaining": session.llm_calls_max - session.llm_calls_used}

        return {"hint": static_hint, "source": "static", "llm_calls_remaining": 0}

    def get_session_status(self, session_id: str) -> dict:
        session = session_manager.get_session(session_id)
        if not session:
            return {"error": "Session not found."}
        return session.performance_summary()

    # ── Private helpers ───────────────────────────────────────────────────────

    def _agent_reaction(
        self,
        scenario:    dict,
        session:     AgentSession,
        command:     str,
        eval_result: dict,
        verdict:     str,
    ) -> Optional[dict]:
        lower_cmd = command.lower().strip()
        
        # 1. Proactive Reaction: Check if user executed diagnostic 'kubectl get pods'
        if lower_cmd == "kubectl get pods" or lower_cmd == "get pods":
            import random
            choice = random.choice([
                {"agent": "Team Lead", "role": "SRE Lead", "message": "Good first step. We now have visibility into cluster health."},
                {"agent": "CTO", "role": "Chief Technology Officer", "message": "We still need root cause confirmation."},
                {"agent": "Manager", "role": "Incident Manager", "message": "Keep an eye on SLA exposure."}
            ])
            return {"agent": choice["agent"], "role": choice["role"], "message": choice["message"], "source": "proactive"}
            
        # 2. Proactive Reaction: Check if user performed a risky action
        is_risky = verdict == "wrong" or any(k in lower_cmd for k in ["drop", "delete", "format", "kill", "rm", "shutdown"])
        if is_risky:
            import random
            choices = [
                {"agent": "Manager", "role": "Incident Manager", "message": "This action may increase operational risk."},
                {"agent": "Team Lead", "role": "SRE Lead", "message": "Please validate the root cause before proceeding."}
            ]
            domain = _detect_domain(scenario)
            if domain == "security" or "security" in scenario.get("id", "") or "firewall" in lower_cmd or "block" in lower_cmd:
                choices.append({"agent": "Security Lead", "role": "Security Operations Lead", "message": "This change may affect evidence collection."})
            
            choice = random.choice(choices)
            return {"agent": choice["agent"], "role": choice["role"], "message": choice["message"], "source": "proactive"}

        agents = scenario.get("agents", [])
        if not agents:
            # Provide standard agent fallbacks if empty
            agents = [{"name": "Incident Manager", "role": "Incident Manager", "message": "Monitoring system alerts."}]

        # Dynamically rotate and match which agent reacts based on the command / domain!
        domain = _detect_domain(scenario)
        agent = agents[0]
        
        if len(agents) > 1:
            lower_cmd = command.lower()
            if "apologize" in lower_cmd or "statement" in lower_cmd or "pr" in lower_cmd or "comms" in lower_cmd:
                # CEO / Manager
                agent = next((a for a in agents if "manager" in a["role"].lower() or "ceo" in a["role"].lower() or "director" in a["role"].lower()), agents[0])
            elif "legal" in lower_cmd or "liability" in lower_cmd or "audit" in lower_cmd:
                # Legal Counsel
                agent = next((a for a in agents if "legal" in a["role"].lower() or "law" in a["role"].lower() or "counsel" in a["role"].lower()), agents[-1])
            elif "restart" in lower_cmd or "rollback" in lower_cmd or "scale" in lower_cmd or "db" in lower_cmd or "pods" in lower_cmd:
                # Tech Lead / SRE Lead
                agent = next((a for a in agents if "lead" in a["role"].lower() or "sre" in a["role"].lower() or "teammate" in a["role"].lower()), agents[-1])
            else:
                # Rotate based on session questions count
                agent = agents[session.total_questions % len(agents)]

        # --- LLM reaction (rotated, budget-aware, custom per action) ---
        use_llm = (
            session.can_call_llm() and
            (verdict in ("wrong", "critical", "correct") or session.total_questions >= 2)
        )
        if use_llm:
            session.use_llm_call()
            sys_p = _agent_system_prompt(scenario, agent)
            usr_p = (
                f"User executed command: '{command}' → resulting in verdict: {verdict} ({eval_result['points']:+d} pts).\n"
                f"Current simulation phase: {session.current_phase}.\n"
                f"React in character as {agent['name']} ({agent['role']}). Give a brief 1-2 sentence response. "
                f"Be supportive/relieved if correct, warning/analytical if wrong, and strategic if critical."
            )
            msg = llm_router.generate_sync(sys_p, usr_p, max_tokens=90)
            if msg:
                return {"agent": agent["name"], "role": agent["role"],
                        "message": msg, "source": "llm"}

        # Canned reaction fallbacks
        canned_msg = eval_result.get("advisor_msg")
        if not canned_msg:
            statics = {
                "critical": "That was exactly the right move. Telemetry metrics are starting to respond.",
                "correct":  "Good. That step has been cataloged successfully. Let's keep working through the playbooks.",
                "wrong":    "Wait, that doesn't look right. We are accumulating degradation. Review playbooks.",
                "prereq":   "Let's handle the prerequisites first to avoid connection pool starvation.",
                "neutral":  "That command executed but didn't affect the telemetry. Let's focus on containment.",
            }
            canned_msg = statics.get(verdict, "Operational command recorded.")

        return {"agent": agent["name"], "role": agent["role"],
                "message": f"[{agent['role']}] {canned_msg}",
                "source": "static"}

    def _static_final_question(self, scenario: dict) -> str:
        return (
            f"✅ You've worked through the core mitigation steps for '{scenario.get('title')}'.\n\n"
            f"Final challenge: What monitoring and alerting would you set up to ensure "
            f"this incident type never goes undetected again? Be specific."
        )


coding_agent = CodingAgent()
