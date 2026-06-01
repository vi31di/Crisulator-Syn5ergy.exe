"""
social_sentiment_agent.py — PR Social Sentiment Agent.
Generates live-ticking public trust metrics and simulated social outrage streams.
"""

from __future__ import annotations
import random
from typing import Dict, Any, List
from agents.llm_router import llm_router

class SocialSentimentAgent:
    def __init__(self):
        # Track public trust scores: { session_id: int (0 to 100) }
        self._public_trust: Dict[str, int] = {}

    def get_trust(self, session_id: str) -> int:
        return self._public_trust.setdefault(session_id, 80)

    def process_sentiment_tick(
        self,
        session_id: str,
        scenario: dict,
        verdict: str,
        tick_counter: int
    ) -> Dict[str, Any]:
        """
        Updates public trust values and returns a realistic simulated social media backlash.
        """
        trust = self.get_trust(session_id)
        
        # Calculate metric updates based on response verdicts
        if verdict in ("correct", "critical"):
            trust = min(100, trust + 8)
        elif verdict == "wrong":
            trust = max(0, trust - 15)
        else:
            trust = max(0, trust - 3)  # Slow decay over time
            
        self._public_trust[session_id] = trust
        outrage_level = 100 - trust
        
        # Generate simulated tweets or social media posts showing public reaction
        usernames = ["@tech_watcher", "@srv_status", "@datacenter_dread", "@pissed_customer", "@equity_analyst"]
        user = random.choice(usernames)
        
        sys_prompt = (
            f"You are a disgruntled user {user} posting on social media about an active crisis.\n"
            f"Outrage Level: {outrage_level}/100 (100 = furious, calling for boycotts; 10 = neutral, waiting for updates).\n"
            f"Scenario: {scenario.get('title')} — {scenario.get('brief','')}\n"
            "Write ONE realistic social media post (tweet) reflecting the current outrage level.\n"
            "STRICT RULES: Keep it under 200 characters. Use 1 relevant hashtag. No markdown."
        )
        
        user_msg = f"Generate post. Trust rating: {trust}%."
        social_post = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=60)
        
        if not social_post:
            social_post = f"Still waiting on updates from the team regarding this outage... #StatusUpdate"

        return {
            "public_trust_score": trust,
            "outrage_velocity_index": outrage_level,
            "trending_post": {
                "user": user,
                "post": social_post.strip()
            }
        }

    def clear_session(self, session_id: str):
        self._public_trust.pop(session_id, None)

social_sentiment_agent = SocialSentimentAgent()