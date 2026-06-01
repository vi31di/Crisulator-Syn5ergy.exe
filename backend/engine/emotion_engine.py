from engine.canonical_state import CanonicalState

class EmotionEngine:
    @staticmethod
    def process_stress_propagation(state: CanonicalState):
        """
        Stress cascades between stakeholders.
        """
        mutations = []
        stresses = state.stakeholders["stress_levels"]
        
        # If PR/Legal is stressed (due to public outrage), it increases Manager stress
        if state.public_reaction["public_trust"] < 50:
            mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "pr", "value": 2, "operation": "add"})
            mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "legal", "value": 2, "operation": "add"})
            
            # Cascade: PR panic makes Manager panic
            if stresses.get("pr", 0) > 30:
                mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "manager", "value": 1, "operation": "add"})
                
        # If infra health is critical, CTO stress spikes
        if state.infrastructure["health"] < 40:
            mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "cto", "value": 2, "operation": "add"})
            # Cascade: CTO stress makes Tech Lead stressed
            if stresses.get("cto", 0) > 40:
                mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "lead", "value": 1, "operation": "add"})
                
        # Teammate stress increases based on cognitive load
        if state.fatigue.get("cognitive_load", 0) > 60:
            mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": "teammate", "value": 1, "operation": "add"})
            
        return mutations
