import copy
from engine.kernel_invariants import KernelInvariants, InvariantViolation
from engine.state_operations import StateOperations

class MutationApplier:
    @staticmethod
    def commit(state, mutations, intent_id=None, causal_chain_hash=None):
        """
        TRUE Transaction Isolation:
        1. Deep copies canonical state to staged_state.
        2. Applies all mutations directly to staged_state.
        3. Runs full KernelInvariants against staged_state.
        4. ONLY if validation passes, swaps staged_state into canonical state.
        
        If ANY error or validation fails, returns a rejected causality log entry
        without touching canonical state.
        """
        if not mutations:
            return []
            
        staged_state = copy.deepcopy(state)
        staged_changes = []
        
        try:
            for mut in mutations:
                domain = mut["domain"]
                key = mut["key"]
                sub_key = mut.get("sub_key")
                value = mut["value"]
                operation = mut.get("operation", "set")
                
                target = getattr(staged_state, domain, None)
                if target is None:
                    raise ValueError(f"Invalid mutation domain: {domain}")
                    
                if sub_key:
                    if key not in target or not isinstance(target[key], dict):
                        raise ValueError(f"Invalid sub_key target: {domain}.{key}.{sub_key}")
                    current_val = target[key].get(sub_key, 0)
                else:
                    if key not in target:
                        raise ValueError(f"Invalid key target: {domain}.{key}")
                    current_val = target[key]
                
                if operation == "add":
                    new_val = current_val + value
                elif operation == "sub":
                    new_val = current_val - value
                else:
                    new_val = value
                    
                # Clamping / Normalization
                if domain == "infrastructure":
                    if key in ["health", "recovery_debt", "latent_instability"]:
                        new_val = max(0, min(100, new_val))
                elif domain == "stakeholders":
                    if key == "confidence":
                        new_val = max(0, min(100, new_val))
                    elif key == "stress_levels" and sub_key:
                        new_val = max(0, new_val)
                    elif key == "beliefs" and sub_key:
                        new_val = max(0.0, min(1.0, new_val))
                elif domain == "fatigue":
                    if key in ["attention_budget", "cognitive_load"]:
                        new_val = max(0, min(100, new_val))
                    elif key == "ui_penalty":
                        new_val = max(0.0, min(1.0, new_val))
                elif domain == "tool_reputation" and sub_key:
                    new_val = max(0.0, min(1.0, new_val))
                
                # Apply mutation to staged state
                if sub_key:
                    target[key][sub_key] = new_val
                else:
                    target[key] = new_val
                    
                staged_changes.append({
                    "domain": domain,
                    "key": key,
                    "sub_key": sub_key,
                    "before": current_val,
                    "after": new_val,
                    "delta": new_val - current_val if isinstance(new_val, (int, float)) and isinstance(current_val, (int, float)) else None
                })
                
            # Full structured validation of the entire staged state!
            KernelInvariants.validate(staged_state)
            
            # Atomic commit swap
            state.__dict__.update(staged_state.__dict__)
            
            # Generate Causality Payload
            before_state = {f"{c['key']}.{c['sub_key']}" if c["sub_key"] else c["key"]: c["before"] for c in staged_changes}
            after_state = {f"{c['key']}.{c['sub_key']}" if c["sub_key"] else c["key"]: c["after"] for c in staged_changes}
            deltas = {f"{c['key']}.{c['sub_key']}" if c["sub_key"] else c["key"]: c["delta"] for c in staged_changes if c["delta"] is not None}
            
            causality_entry = {
                "schema_version": "1.0.0",
                "intent_id": intent_id,
                "parent_event_id": causal_chain_hash,
                "chain_depth": StateOperations.get_causal_depth(state, causal_chain_hash),
                "before": before_state,
                "after": after_state,
                "delta": deltas,
                "mutation_status": "committed"
            }
            
            return [causality_entry]
            
        except (ValueError, InvariantViolation, KeyError) as e:
            # Atomic rollback - state is completely untouched!
            return [{
                "schema_version": "1.0.0",
                "intent_id": intent_id,
                "parent_event_id": causal_chain_hash,
                "chain_depth": StateOperations.get_causal_depth(state, causal_chain_hash),
                "mutation_status": "rejected",
                "rejection_reason": str(e)
            }]
