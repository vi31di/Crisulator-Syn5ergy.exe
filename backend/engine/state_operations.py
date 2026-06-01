from engine.canonical_state import CanonicalState

class StateOperations:
    _causal_depth_cache = {}

    @staticmethod
    def get_causal_depth(state: CanonicalState, parent_event_id: str) -> int:
        if not parent_event_id:
            return 1
            
        if parent_event_id in StateOperations._causal_depth_cache:
            return StateOperations._causal_depth_cache[parent_event_id] + 1
            
        # If not in cache, fallback to checking log (expensive)
        depth = 1
        for entry in state.causality_log:
            if entry.get("parent_event_id") == parent_event_id:
                depth = entry.get("chain_depth", 1) + 1
                break
                
        StateOperations._causal_depth_cache[parent_event_id] = depth
        return depth
        
    @staticmethod
    def append_event(state: CanonicalState, event: dict):
        state.timeline["events"].append(event)
        
    @staticmethod
    def append_causality(state: CanonicalState, causality_entries: list):
        if not causality_entries:
            return
        state.causality_log.extend(causality_entries)
        
    @staticmethod
    def enqueue_intent(state: CanonicalState, intent: dict):
        intent["lifecycle"] = "queued"
        state.intent_queue.append(intent)
        
    @staticmethod
    def enqueue_mutations(state: CanonicalState, mutations: list):
        if not mutations:
            return
        state.mutation_queue.extend(mutations)
        
    @staticmethod
    def clear_mutations(state: CanonicalState):
        state.mutation_queue.clear()
        
    @staticmethod
    def archive_intent(state: CanonicalState, intent_id: str):
        # We don't archive to state indefinitely to prevent memory bloat
        # Simply drop it from intent_queue
        state.intent_queue = [i for i in state.intent_queue if i.get("id") != intent_id]

    @staticmethod
    def start_tick(state: CanonicalState):
        state.tick_in_progress = True

    @staticmethod
    def end_tick(state: CanonicalState):
        state.tick_in_progress = False
        
    @staticmethod
    def append_snapshot(state: CanonicalState, snapshot: dict):
        state.state_snapshots.append(snapshot)
        if len(state.state_snapshots) > 50:
            state.state_snapshots = state.state_snapshots[-50:]
            
    @staticmethod
    def set_integrity_score(state: CanonicalState, score: int):
        state.simulation_integrity_score = score
