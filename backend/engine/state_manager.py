from typing import Dict, Optional
from engine.canonical_state import CanonicalState
import json
import os

# Dictionary holding active sessions (state_key -> CanonicalState dict)
ACTIVE_INCIDENT_STATES: Dict[str, dict] = {}
# Orchestration runtime locks (state_key -> bool)
TICK_LOCKS: Dict[str, bool] = {}

class StateManager:
    @staticmethod
    def initialize_session(scenario_id: str) -> str:
        state_key = f"session_{scenario_id}"
        if state_key not in ACTIVE_INCIDENT_STATES:
            new_state = CanonicalState(scenario_id)
            ACTIVE_INCIDENT_STATES[state_key] = new_state.dict()
            TICK_LOCKS[state_key] = False
        return state_key

    @staticmethod
    def get_state(scenario_id: str) -> CanonicalState:
        state_key = f"session_{scenario_id}"
        if state_key not in ACTIVE_INCIDENT_STATES:
            state_key = StateManager.initialize_session(scenario_id)
        
        return CanonicalState.from_dict(ACTIVE_INCIDENT_STATES[state_key], scenario_id)

    @staticmethod
    def save_state(state: CanonicalState):
        state_key = f"session_{state.scenario_id}"
        ACTIVE_INCIDENT_STATES[state_key] = state.dict()
        
    @staticmethod
    def acquire_tick_lock(scenario_id: str) -> bool:
        state_key = f"session_{scenario_id}"
        if TICK_LOCKS.get(state_key, False):
            return False
        TICK_LOCKS[state_key] = True
        return True
        
    @staticmethod
    def release_tick_lock(scenario_id: str):
        state_key = f"session_{scenario_id}"
        TICK_LOCKS[state_key] = False

    @staticmethod
    def load_scenario(scenario_id: str, scenarios_dict: dict) -> Optional[dict]:
        """Looks up the scenario configuration from the loaded in-memory database."""
        for role_scenarios in scenarios_dict.values():
            for s in role_scenarios:
                if s.get("id") == scenario_id:
                    return s
        return None
