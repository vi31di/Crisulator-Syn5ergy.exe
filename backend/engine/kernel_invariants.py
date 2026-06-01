from engine.canonical_state import CanonicalState
import math

class InvariantViolation(Exception):
    pass

class KernelInvariants:
    @staticmethod
    def validate(state: CanonicalState):
        """
        Validates the absolute truth of the CanonicalState.
        Raises InvariantViolation if state is corrupted.
        """
        # Infrastructure Bounds
        if not (0 <= state.infrastructure.get("health", 100) <= 100):
            raise InvariantViolation(f"health out of bounds: {state.infrastructure.get('health')}")
        
        # Stakeholder Bounds
        if not (0 <= state.stakeholders.get("confidence", 100) <= 100):
            raise InvariantViolation(f"confidence out of bounds: {state.stakeholders.get('confidence')}")
            
        for belief_key, belief_val in state.stakeholders.get("beliefs", {}).items():
            if not (0.0 <= belief_val <= 1.0):
                raise InvariantViolation(f"belief {belief_key} out of bounds: {belief_val}")
                
        # Public Reaction Bounds
        if not (0 <= state.public_reaction.get("public_trust", 100) <= 100):
            raise InvariantViolation(f"public_trust out of bounds: {state.public_reaction.get('public_trust')}")
            
        # NaN/Inf checks
        for val in state.infrastructure.values():
            if isinstance(val, (int, float)) and (math.isnan(val) or math.isinf(val)):
                raise InvariantViolation("NaN or Inf detected in infrastructure")
                
        # Causality Acyclicity & Snapshot Versioning
        last_tick = -1
        for snapshot in state.state_snapshots:
            if "schema_version" not in snapshot:
                raise InvariantViolation(f"snapshot missing schema_version. Tick: {snapshot.get('tick')}")
            if snapshot.get("tick", 0) < last_tick:
                raise InvariantViolation("Monotonic tick violation in snapshots.")
            last_tick = snapshot.get("tick", 0)
                
        for log in state.causality_log:
            if "schema_version" not in log:
                raise InvariantViolation(f"causality log entry missing schema_version. Tick: {log.get('tick')}")
                
        # Duplicate Intent check
        intent_ids = set()
        for r in state.resolution_records:
            iid = r.get("intent_id")
            if iid and iid in intent_ids:
                raise InvariantViolation(f"Duplicate intent_id {iid} in resolution records")
            intent_ids.add(iid)
                
        # Known invariants pass
        return True
