from engine.canonical_state import CanonicalState
from engine.deterministic_rng import DeterministicRNG
from engine.mutation_applier import MutationApplier
from engine.state_operations import StateOperations

class NarrativeEngine:
    @staticmethod
    def process_narrative(state: CanonicalState):
        """
        Manages the evolution of the incident's story and competing theories.
        """
        duration = state.infrastructure.get("health", 100)
        
        # If infra is low and we haven't found a root cause, theories breed
        if state.infrastructure["health"] < 60 and state.narrative["dominant_theory"] == "Unknown":
            theories = ["DDoS Attack", "Bad Deployment", "Database Deadlock", "DNS Routing Failure"]
            
            # Avoid picking a theory that was already disproven
            valid_theories = [t for t in theories if t not in state.narrative["disproven_theories"]]
            
            seed = f"{state.id}:{state.timeline.get('tick_counter', 0)}"
            if valid_theories and DeterministicRNG.seeded_random("narrative", seed) < 0.2:
                new_theory = DeterministicRNG.seeded_choice("narrative", seed + "_choice", valid_theories)
                
                c = MutationApplier.commit(state, [
                    {"domain": "narrative", "key": "dominant_theory", "value": new_theory, "operation": "set"},
                    {"domain": "timeline", "key": "events", "value": [{"priority": "high", "type": "system", "sender": "System", "message": f"Team is now investigating {new_theory} as the primary hypothesis."}], "operation": "add"}
                ], intent_id="sys_narrative", causal_chain_hash=f"sys_narrative_{state.timeline.get('tick_counter', 0)}")
                
                StateOperations.append_causality(state, c)
