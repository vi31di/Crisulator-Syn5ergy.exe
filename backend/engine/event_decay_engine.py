from engine.canonical_state import CanonicalState

class EventDecayEngine:
    @staticmethod
    def process(state: CanonicalState):
        """
        Memory fades over time. Slowly reduces panic, restores confidence,
        and lowers cognitive load if the incident remains stable.
        """
        mutations = []
        
        # If infra is stable (e.g., > 80), stress decays
        if state.infrastructure["health"] > 80:
            for persona, stress in state.stakeholders["stress_levels"].items():
                if stress > 5:
                    mutations.append({"domain": "stakeholders", "key": "stress_levels", "sub_key": persona, "value": 1, "operation": "sub"})
                    
            if state.stakeholders["confidence"] < 90:
                mutations.append({"domain": "stakeholders", "key": "confidence", "value": 1, "operation": "add"})
                
        # Fatigue recovery if attention budget is somewhat available
        if state.fatigue["attention_budget"] > 80:
            if state.fatigue["cognitive_load"] > 0:
                mutations.append({"domain": "fatigue", "key": "cognitive_load", "value": 1, "operation": "sub"})
                
        # Latent instability slowly normalizes if infra health stays 100 for a long time
        if state.infrastructure["health"] == 100 and state.infrastructure["latent_instability"] > 0:
            mutations.append({"domain": "infrastructure", "key": "latent_instability", "value": 1, "operation": "sub"})
            
        # Recovery Debt converts into latent instability over time
        if state.infrastructure.get("recovery_debt", 0) > 0:
            conversion = min(5, state.infrastructure["recovery_debt"])
            mutations.append({"domain": "infrastructure", "key": "recovery_debt", "value": conversion, "operation": "sub"})
            mutations.append({"domain": "infrastructure", "key": "latent_instability", "value": conversion, "operation": "add"})
            
        # Decrease silence ticks and cascade degradation
        silence = state.infrastructure.get("silence_window", {})
        if isinstance(silence, dict) and silence.get("ticks", 0) > 0:
            new_ticks = silence["ticks"] - 1
            new_type = silence["type"]
            
            if new_ticks <= 0:
                # Cascade to next phase instead of ending immediately
                if silence["type"] == "catastrophic_silence":
                    new_type = "telemetry_desync"
                    new_ticks = 2
                elif silence["type"] == "telemetry_desync":
                    new_type = "uneasy_quiet"
                    new_ticks = 2
                elif silence["type"] == "uneasy_quiet":
                    new_type = "partial_visibility"
                    new_ticks = 2
                else:
                    new_type = "none"
                    new_ticks = 0
                    
            mutations.append({"domain": "infrastructure", "key": "silence_window", "value": {"type": new_type, "ticks": new_ticks}, "operation": "set"})
                
        # Belief Decay (Non-linear easing back to 0.5)
        if state.infrastructure["health"] > 70:
            for belief, val in state.stakeholders["beliefs"].items():
                if val > 0.5:
                    new_val = max(0.5, val - (val - 0.5) * 0.1)
                    mutations.append({"domain": "stakeholders", "key": "beliefs", "sub_key": belief, "value": new_val, "operation": "set"})
                elif val < 0.5:
                    new_val = min(0.5, val + (0.5 - val) * 0.1)
                    mutations.append({"domain": "stakeholders", "key": "beliefs", "sub_key": belief, "value": new_val, "operation": "set"})
                    
        # Tool Trust Repair
        if state.infrastructure["health"] > 80 and state.infrastructure["latent_instability"] < 20:
            for tool, categories in state.tool_reputation.items():
                if isinstance(categories, dict):
                    for cat, val in categories.items():
                        if val < 1.0:
                            new_val = min(1.0, val + 0.05)
                            mutations.append({"domain": "tool_reputation", "key": tool, "sub_key": cat, "value": new_val, "operation": "set"})
                            
        return mutations

