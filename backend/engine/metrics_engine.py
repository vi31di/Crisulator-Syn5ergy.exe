from engine.canonical_state import CanonicalState
from engine.deterministic_rng import DeterministicRNG
import time

class MetricsEngine:
    @staticmethod
    def calculate(state: CanonicalState, scenario_metrics_config: dict) -> dict:
        """
        Calculates the TRUE objective metrics mathematically derived from CanonicalState.
        """
        health = state.infrastructure["health"]
        base_error = 100 - health
        
        seed = f"{state.id}:{state.timeline.get('tick_counter', 0)}"
        
        # Determine actual metrics
        true_metrics = {
            "error_rate": max(0, min(100, base_error + DeterministicRNG.seeded_randint("metrics", seed + "_error", -2, 2))),
            "latency": max(50, 5000 - (health * 48) + DeterministicRNG.seeded_randint("metrics", seed + "_latency", -50, 100)),
            "active_connections": max(0, int((health / 100) * 15000) + DeterministicRNG.seeded_randint("metrics", seed + "_conn", -500, 500)),
            "db_load": min(100, max(10, 100 - health + DeterministicRNG.seeded_randint("metrics", seed + "_db", -5, 5))),
            "public_trust": state.public_reaction["public_trust"]
        }
        
        # Override with scenario specific configs if provided
        for m_key, m_config in scenario_metrics_config.items():
            if m_key in true_metrics and m_config.get("locked"):
                true_metrics[m_key] = m_config.get("base_value", true_metrics[m_key])
                
        return true_metrics
