"""
legal_counsel_agent.py — PR Legal Counsel Agent.
Warns the user when statements or plans increase corporate liability risks.
"""

from __future__ import annotations
import re
from typing import Dict, Any, List
from .llm_router import llm_router

class LegalCounselAgent:
    def evaluate_liability_risk(self, proposed_text: str, scenario_title: str) -> Dict[str, Any]:
        """
        Evaluates a proposed statement for legal exposure triggers.
        Returns risk assessment indices and structured warnings.
        """
        # SAFEGUARD: Coalesce potentially empty or None parameters
        proposed_text = proposed_text or ""
        scenario_title = scenario_title or "Active Investigation"
        
        exposure_triggers = {
            r"\b(guilty|our fault|we screwed up|negligent|negligence)\b": 35,
            r"\b(payout|compensate|paying out|full refunds|free money|billions)\b": 25,
            r"\b(covering up|hide|delete logs|delete data)\b": 40
        }
        
        liability_score = 0
        legal_violations = []
        
        for pattern, risk_weight in exposure_triggers.items():
            if re.search(pattern, proposed_text.lower()):
                liability_score += risk_weight
                matched_word = re.search(pattern, proposed_text.lower()).group(0)
                legal_violations.append(f"Premature use of trigger term: '{matched_word}'")

        # Call Groq to formulate standard risk warnings
        sys_prompt = (
            "You are a highly conservative, risk-averse Corporate Legal Counsel.\n"
            "Review the statement and write a sharp, clinical legal warning.\n"
            "Caution them to frame statements as 'active investigations' and avoid admitting fault or monetary values.\n"
            "STRICT RULES: Max 2 sentences. No preambles, no legal jargon templates, no markdown."
        )
        
        user_msg = f"Scenario: {scenario_title}. Liability Score: {liability_score}/100. Proposed Statement: '{proposed_text}'"
        counsel_warning = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=80)
        
        if not counsel_warning:
            counsel_warning = "Frame statements as active updates pending forensic verification. Avoid premature admissions of liability."

        return {
            "liability_exposure_index": min(100, liability_score),
            "unsafe_statements_flag": liability_score > 20,
            "specific_legal_violations": legal_violations,
            "counsel_formal_warning": f"⚖️ Legal Counsel: {counsel_warning}"
        }

legal_counsel_agent = LegalCounselAgent()