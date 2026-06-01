"""
journalist_agent.py — PR Journalist Agent.
Asks confrontational press questions that escalate in hostility if dodged.
"""

from __future__ import annotations
import random
from typing import Dict, Any, List
from .llm_router import llm_router

class JournalistAgent:
    def __init__(self):
        # Track journalist hostility levels: { session_id: float (0.0 to 1.0) }
        self._hostility: Dict[str, float] = {}

    def get_hostility(self, session_id: str) -> float:
        # BUG FIXED: Standardized '_session_hostility' to '_hostility'
        return self._hostility.setdefault(session_id, 0.2)

    def formulate_press_question(
        self,
        session_id: str,
        scenario: dict,
        user_plan: str,
        verdict: str
    ) -> Dict[str, Any]:
        """
        Generates press queries. Hostility increases if user gets bad actions, or avoids transparent fixes.
        """
        user_plan = user_plan or ""
        verdict = verdict or "neutral"
        scenario = scenario or {}
        
        hostility = self.get_hostility(session_id)
        
        # Escalate hostility based on negative response patterns
        if verdict in ("wrong", "prereq"):
            hostility = min(1.0, hostility + 0.25)
        elif "apologize" not in user_plan.lower() and "apology" not in user_plan.lower():
            hostility = min(1.0, hostility + 0.15)
        else:
            hostility = max(0.1, hostility - 0.1)
            
        self._hostility[session_id] = hostility
        
        media_outlet = random.choice(["TechCrunch", "Bloomberg", "Reuters", "Wired", "Wall Street Journal"])
        
        # Compile dynamic press probe
        sys_prompt = (
            f"You are a critical, analytical tech journalist from {media_outlet}.\n"
            f"Hostility rating: {hostility:.2f} (1.0 = highly confrontational/aggressive, 0.1 = factual).\n"
            f"Scenario: {scenario.get('title', 'System Event')} — {scenario.get('brief','')}\n"
            "Ask ONE highly relevant, sharp question regarding the company's integrity or failure.\n"
            "If hostility is high, do not hesitate to ask if there was a cover-up or if leadership is resigning.\n"
            "STRICT RULES: Max 2 sentences. Sound like a real reporter. Do not introduce yourself. No markdown."
        )
        
        user_msg = f"Responder's statement/plan: '{user_plan}'. Verdict context: {verdict}."
        press_query = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=100)
        
        if not press_query:
            press_query = "Can you confirm what steps are being taken to guarantee this failure doesn't happen again?"

        return {
            "source": "journalist",
            "outlet": media_outlet,
            "hostility_rating": round(hostility, 2),
            "question": f"🎤 [{media_outlet}]: {press_query}"
        }

    def clear_session(self, session_id: str):
        self._hostility.pop(session_id, None)

journalist_agent = JournalistAgent()