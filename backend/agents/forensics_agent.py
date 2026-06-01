"""
forensics_agent.py — Cybersecurity Forensics Soundness Agent.
Validates the digital hygiene and forensic soundness of the responder's commands.
"""

from __future__ import annotations
from typing import Dict, Any, List
from agents.llm_router import llm_router

class ForensicsAgent:
    def analyze_command_hygiene(self, completed_actions: List[str], scenario_title: str) -> Dict[str, Any]:
        """
        Analyzes executed commands for anti-forensic or sloppy operations.
        Returns a forensic score (0-100) and structured audit notes.
        """
        score = 100
        violations = []
        
        # Rule 1: Flushing firewall rules before capture wipes connection evidence
        if any("iptables -f" in cmd.lower() or "iptables --flush" in cmd.lower() for cmd in completed_actions):
            score -= 25
            violations.append("Flushed active firewall rules (iptables -F), destroying connection records and state logs.")
            
        # Rule 2: Deleting files instead of isolating or renaming
        if any("rm " in cmd.lower() or "delete " in cmd.lower() for cmd in completed_actions):
            score -= 20
            violations.append("Executed file deletion (rm/delete). Threat files should be isolated, quarantined, or preserved.")
            
        # Rule 3: Reboots without snapshot/RAM capture wipes volatile memory
        if any("reboot" in cmd.lower() or "restart" in cmd.lower() for cmd in completed_actions):
            if not any("dump" in cmd.lower() or "snapshot" in cmd.lower() or "sha" in cmd.lower() for cmd in completed_actions):
                score -= 15
                violations.append("Triggered system reboots/restarts before calculating file hashes or dump captures.")

        # Request specialized technical summary review from Groq
        sys_prompt = (
            "You are a Digital Forensics and Incident Response (DFIR) auditor.\n"
            "Review the violations list and write a brief, constructive forensic critique.\n"
            "Keep the feedback direct, professional, and technical.\n"
            "STRICT RULES: Max 3 sentences. No bullet points. No markdown."
        )
        
        user_msg = f"Scenario: {scenario_title}. Score: {score}/100. Violations found:\n" + "\n".join(violations)
        audit_critique = llm_router.generate_sync(sys_prompt, user_msg, max_tokens=100)
        
        if not audit_critique:
            audit_critique = "All diagnostic steps captured cleanly. Maintain strict evidence preservation processes."

        return {
            "forensic_score": max(0, score),
            "forensics_clean_status": score >= 80,
            "critical_violations_found": violations,
            "forensic_expert_audit": audit_critique
        }

forensics_agent = ForensicsAgent()