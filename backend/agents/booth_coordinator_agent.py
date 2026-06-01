"""
booth_coordinator_agent.py — PR Booth Coordinator Agent.
Tracks recruitment staff morale under fire at GHC-type event booths.
"""

from __future__ import annotations
from typing import Dict, Any, Optional
from .llm_router import llm_router

class BoothCoordinatorAgent:
    def __init__(self):
        # Track staff morale levels: { session_id: int (0 to 100) }
        self._morale: Dict[str, int] = {}

    def get_morale(self, session_id: str) -> int:
        return self._morale.setdefault(session_id, 100)

    def evaluate_booth_pressure(
        self,
        session_id: str,
        scenario_id: str,
        verdict: str,
        command: str
    ) -> Optional[Dict[str, Any]]:
        """
        Updates recruitment staff morale. Only fires for 'GHC' or recruitment-focused events.
        """
        # SAFEGUARD: Coalesce parameters to prevent checks on None values
        scenario_id = scenario_id or ""
        command = command or ""
        verdict = verdict or "neutral"

        if "ghc" not in scenario_id:
            return None
            
        morale = self.get_morale(session_id)
        
        # Calculate morale impact based on coaching and decisions
        if "coach" in command.lower() or "guidelines" in command.lower():
            morale = min(100, morale + 25)
            message_direction = "staff feel extremely supported and clear on communications"
        elif verdict == "wrong":
            morale = max(0, morale - 20)
            message_direction = "staff are being confronted by protestors and feel abandoned"
        else:
            morale = max(0, morale - 5)  # General fatigue under load
            message_direction = "staff are tired but holding the line"
            
        self._morale[session_id] = morale

        # Generate a realistic Slack message from the Booth Coordinator
        sys_prompt = (
            "You are a GHC Recruitment Booth Coordinator managing the physical booth on the convention floor.\n"
            f"Atmosphere Context: {message_direction}.\n"
            f"Booth Morale Level: {morale}%.\n"
            "Write a brief, realistic Slack ping to the PR Director (the player) describing the scene at the booth.\n"
            "STRICT RULES: Max 2 sentences. Sound like an on-site recruiter under pressure. No markdown."
        )
        
        user_msg = f"Proposed command: {command}. Morale is now {morale}%."
        coordinator_ping = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=80)
        
        if not coordinator_ping:
            coordinator_ping = "Staff are managing requests, but we really need an official statement to share with attendees."

        return {
            "type": "booth_morale_update",
            "recruiter_staff_morale": morale,
            "attendees_hostility_index": 100 - morale,
            "message": f"💬 [Booth-Staff-Slack]: {coordinator_ping}"
        }

    def clear_session(self, session_id: str):
        self._morale.pop(session_id, None)

booth_coordinator_agent = BoothCoordinatorAgent()