"""
attacker_agent.py — Cybersecurity Attacker Agent.
Tracks and narrates lateral movement progression as the user delays.
"""

from __future__ import annotations
from typing import Optional, Dict, Any
from agents.llm_router import llm_router

KILL_CHAIN_STAGES = {
    1: "Reconnaissance & Asset Profiling",
    2: "Active Foothold & Command/Control Setup",
    3: "Internal Subnet Pivoting & Lateral Scanning",
    4: "Credential Harvesting & Local Admin Hijacking",
    5: "Database Staging, Encryption, and Exfiltration"
}

class AttackerAgent:
    def __init__(self):
        # Track active compromise stage per session: { session_id: stage_int }
        self._session_stages: Dict[str, int] = {}

    def get_stage(self, session_id: str) -> int:
        return self._session_stages.setdefault(session_id, 1)

    def advance_attacker(
        self,
        session_id: str,
        scenario_id: str,
        completed_actions: list[str],
        tick_counter: int
    ) -> Optional[Dict[str, Any]]:
        """
        Increases the attacker's stage if the user fails to execute defensive isolating actions.
        """
        current_stage = self.get_stage(session_id)
        
        # Check if user has isolated the threat
        isolated = any(
            any(kw in cmd for kw in ["isolate", "block", "drop", "iptables", "terminate"])
            for cmd in completed_actions
        )

        # Attacker advances if not isolated and user has completed at least 1 action per tick cycle
        if not isolated and tick_counter % 2 == 0 and current_stage < 5:
            current_stage += 1
            self._session_stages[session_id] = current_stage
            
            # Formulate dynamic lateral movement progression message
            sys_prompt = (
                f"You are an advanced state-sponsored threat actor compromising an asset for: {scenario_id}.\n"
                f"You have advanced to Stage {current_stage} of the cyber kill chain: {KILL_CHAIN_STAGES[current_stage]}.\n"
                "Write a highly technical, brief in-character log narration of your lateral progression.\n"
                "Example: 'Lateral movement succeeded: pivot shell opened on Domain Controller. Dumping LSASS.'\n"
                "STRICT RULES: Max 2 sentences. Sound highly competent, professional, and ominous. No markdown."
            )
            
            user_msg = f"Describe progress. Exfiltrated actions so far: {', '.join(completed_actions[-2:]) or 'none'}"
            llm_narrative = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=80)
            
            if not llm_narrative:
                # Static fallback
                llm_narrative = f"Attacker lateral progression detected. Currently at Stage {current_stage} ({KILL_CHAIN_STAGES[current_stage]})."

            return {
                "type": "attacker_action",
                "stage": current_stage,
                "stage_description": KILL_CHAIN_STAGES[current_stage],
                "message": f"🕵️ Attacker Log: {llm_narrative}",
                "metric_impact_delta": 15 * current_stage  # Increases public risk risk factor
            }
            
        return None

    def clear_session(self, session_id: str):
        self._session_stages.pop(session_id, None)

attacker_agent = AttackerAgent()