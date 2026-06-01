from engine.canonical_state import CanonicalState

class TrustEngine:
    @staticmethod
    def authorize_command(state: CanonicalState, classification: str, command: str) -> dict:
        """
        Evaluates Trust Gates. Destructive or major recovery commands require stakeholder confidence.
        """
        confidence = state.stakeholders["confidence"]
        
        if classification == "destructive":
            if confidence < 30:
                return {
                    "authorized": False, 
                    "reason": "CTO REJECTED: Stakeholder confidence is too low to authorize destructive actions. Submit a proper mitigation plan first."
                }
                
        if classification == "recovery" and "rollback" in command:
            if confidence < 40:
                return {
                    "authorized": False,
                    "reason": "LEADERSHIP BLOCKED: You cannot rollback production with confidence metrics this low. Gain alignment first."
                }
                
        return {"authorized": True, "reason": ""}
