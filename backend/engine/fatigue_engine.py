from engine.canonical_state import CanonicalState
import time

class FatigueEngine:
    @staticmethod
    def process(state: CanonicalState):
        """
        Calculates cognitive overload. Incident duration and simultaneous active
        problems reduce attention budget.
        """
        mutations = []
        duration = time.time() - state.start_time
        
        # Base cognitive load increases with time
        if duration > 120:  # 2 minutes in
            mutations.append({"domain": "fatigue", "key": "cognitive_load", "value": 1, "operation": "add"})
            
        # Severe drops in infra add massive cognitive load
        if state.infrastructure["health"] < 50:
            mutations.append({"domain": "fatigue", "key": "cognitive_load", "value": 2, "operation": "add"})
            
        # Calculate UI penalty
        # If cognitive load > 50, UI penalty increases, simulating overwhelm
        if state.fatigue["cognitive_load"] > 50:
            new_val = min(1.0, state.fatigue["ui_penalty"] + 0.1)
        else:
            new_val = max(0.0, state.fatigue["ui_penalty"] - 0.05)
            
        mutations.append({"domain": "fatigue", "key": "ui_penalty", "value": new_val, "operation": "set"})
        
        return mutations
