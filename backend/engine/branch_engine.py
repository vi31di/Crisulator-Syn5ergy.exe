from engine.canonical_state import CanonicalState
import time

class BranchEngine:
    @staticmethod
    def determine_ending(state: CanonicalState) -> dict:
        """
        Evaluates narrative branches based on political and technical metrics.
        """
        infra = state.infrastructure["health"]
        impact = state.public_reaction["customer_impact"]
        pol = state.stakeholders["confidence"] # Using confidence as proxy for political capital
        risk = state.public_reaction["legal_risk"]
        
        # Branch 1: Total Outage
        if infra < 20 and impact > 80:
            return {
                "branch_id": "cascading_failure",
                "title": "Catastrophic Systems Failure",
                "description": "Technical mitigation failed completely. Massive downtime and irreversible reputational damage.",
                "fired": True
            }
            
        # Branch 2: Political Fallout
        if infra > 80 and pol < 30:
            return {
                "branch_id": "executive_review",
                "title": "Mitigated with Extreme Prejudice",
                "description": "Systems stable, but reckless actions and broken promises destroyed leadership trust. You are facing executive review.",
                "fired": True
            }
            
        # Branch 3: Compliance Disaster
        if infra > 70 and risk > 80:
            return {
                "branch_id": "compliance_investigation",
                "title": "Regulatory Investigation",
                "description": "Systems online, but data breach disclosure laws were violated triggering a federal investigation.",
                "fired": False
            }
            
        # Branch 4: Partial Recovery
        if infra > 50 and impact > 40:
            return {
                "branch_id": "partial_recovery",
                "title": "SLA Violated - Partial Recovery",
                "description": "Bleeding stopped, but SLAs breached. Customers migrating.",
                "fired": False
            }
            
        # Branch 5: Flawless
        return {
            "branch_id": "successful_mitigation",
            "title": "Operational Excellence",
            "description": "Flawless incident command. Systems stabilized, stakeholders aligned, trust maintained.",
            "fired": False
        }
