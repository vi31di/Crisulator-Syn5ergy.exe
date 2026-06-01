"""
siem_agent.py — Cybersecurity SIEM Agent.
Generates deceptive or critical distraction alerts mid-session to pressure-test focus.
"""

from __future__ import annotations
import random
from typing import Optional, Dict, Any
from agents.llm_router import llm_router

# Static distraction templates to completely bypass LLM when rate-limited
DISTRACTION_ALERTS = [
    "⚠️ [SIEM ALERT] [SSH_BRUTEFORCE] 50+ failed login attempts detected on auxiliary-printer-subnet (192.168.12.9). Source: External.",
    "🚨 [SIEM ALERT] [UNAUTHORIZED_REG_CHANGE] Windows registry values changed on HR-laptop-042. Path: HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run.",
    "⚠️ [SIEM ALERT] [PORT_SCAN] Inbound TCP SYN scan detected targeting public web-assets. Range: ports 1-1024. Rate: 500 packets/sec.",
    "🚨 [SIEM ALERT] [LOG_DELETION] Security event log cleared on dev-box-01. User context: SYSTEM.",
    "⚠️ [SIEM ALERT] [HIGH_MEMORY_UTIL] Memory utilization on secondary-analytics-node-03 exceeds 96%. Node state: Degrading."
]

class SiemAgent:
    def trigger_distraction(self, scenario_id: str, tick_counter: int) -> Optional[Dict[str, Any]]:
        """
        Deterministically evaluates if a SIEM distraction should fire based on tick intervals.
        """
        # Only trigger SIEM distractions on specific tense tick intervals (e.g., tick 3 and tick 6)
        if tick_counter not in (3, 6):
            return None

        # Try to customize alert based on domain utilizing Groq
        sys_prompt = (
            "You are an enterprise SIEM security appliance generating simulated distraction alerts.\n"
            "Generate ONE highly realistic SIEM distraction alert. It must look like standard syslog/alert log.\n"
            "Make it technically plausible but UNRELATED to the core threat. "
            "Examples: SSH failures, unexpected print jobs, anomalous file changes on unrelated subnets.\n"
            "STRICT RULES: Output exactly ONE line of log text. No markdown, no preambles, no quotes."
        )
        
        user_msg = f"Generate alert. Context: Scenario is {scenario_id}, tick is {tick_counter}."
        llm_alert = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=60)

        if llm_alert:
            alert_text = llm_alert.strip()
        else:
            alert_text = random.choice(DISTRACTION_ALERTS)

        return {
            "type": "siem_alert",
            "priority": "medium",
            "sender": "SIEM Sensor",
            "message": alert_text,
            "instructions": "Verify if this matches the active indicators of compromise or is simply lateral environmental noise."
        }

siem_agent = SiemAgent()