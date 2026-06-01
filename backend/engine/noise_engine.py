from engine.canonical_state import CanonicalState
from engine.deterministic_rng import DeterministicRNG

class NoiseEngine:
    @staticmethod
    def apply_noise(state: CanonicalState, raw_metrics: dict, role: str) -> dict:
        """
        Takes raw true metrics and applies perceptual noise, staleness, and confidence
        intervals based on the player's role, fatigue, and infra health.
        """
        fatigue = state.fatigue.get("cognitive_load", 0)
        infra_health = state.infrastructure.get("health", 100)
        
        perceived_metrics = {}
        
        # Tool-specific confidence profiling
        tool_profiles = {
            "datadog": {"staleness_chance": 0.2, "noise_multiplier": 0.5},
            "kubernetes": {"staleness_chance": 0.05, "noise_multiplier": 1.0},
            "grafana": {"staleness_chance": 0.4, "noise_multiplier": 2.0}
        }
        
        metric_sources = {
            "error_rate": "datadog",
            "p95_latency": "grafana",
            "db_connections": "kubernetes",
            "cpu": "kubernetes"
        }
        
        # Silence Window Force
        silence_window = state.infrastructure.get("silence_window", {"type": "none", "ticks": 0})
        is_silenced = silence_window.get("ticks", 0) > 0
        silence_type = silence_window.get("type", "none")
            
        for key, true_val in raw_metrics.items():
            source = metric_sources.get(key, "datadog")
            profile = tool_profiles[source]
            
            # Map metric key to domain for contextual trust
            domain = "infra"
            if key == "error_rate": domain = "auth"
            elif key == "p95_latency": domain = "latency"
            
            reputation = state.tool_reputation.get(source, {}).get(domain, 1.0)
            
            # Base confidence drops if infra is struggling and reputation is low
            base_confidence = max(0.2, (infra_health / 100.0) * reputation)
            
            # Fatigue further degrades UI confidence
            if fatigue > 80:
                base_confidence -= 0.1
                
            # Seed string for determinism
            # Hash includes scenario, tick, metric key, and instability
            tick_id = state.timeline.get("tick_counter", 0)
            instability = state.infrastructure.get("latent_instability", 0)
            seed = f"{state.id}:{tick_id}:{key}:{instability}"
                
            # Apply tool-specific staleness chance
            staleness_roll = DeterministicRNG.seeded_random("noise", seed + ":stale")
            is_stale = staleness_roll > (base_confidence * (1.0 - profile["staleness_chance"])) or is_silenced
            
            if silence_type == "telemetry_desync":
                is_stale = True # Force stale
            
            # Role-based perception
            if role == "pr" and key not in ["error_rate", "public_trust"]:
                continue # PR doesn't see DB connections
                
            if is_stale:
                # Add noise biased by tool profile
                noise_range = int(10 * profile["noise_multiplier"])
                noise_addition = DeterministicRNG.seeded_randint("noise", seed + ":noise", -noise_range, noise_range) if isinstance(true_val, int) else 0
                noisy_val = true_val + noise_addition
                
                # If latent instability is high, Grafana drops out entirely sometimes
                if source == "grafana" and state.infrastructure["latent_instability"] > 60:
                    noisy_val = 0
                    
                freshness_roll = DeterministicRNG.seeded_random("noise", seed + ":freshness")
                freshness = "stale_90s" if (freshness_roll > 0.5 or is_silenced) else "degraded"
                
                if silence_type == "catastrophic_silence":
                    confidence = 0.0
                elif silence_type == "telemetry_desync":
                    conf_roll = DeterministicRNG.seeded_uniform("noise", seed + ":conf", 0.1, 0.4)
                    confidence = round(base_confidence * conf_roll, 2)
                    noisy_val = true_val * DeterministicRNG.seeded_choice("noise", seed + ":contradiction", [0, 2])
                else:
                    conf_roll = DeterministicRNG.seeded_uniform("noise", seed + ":conf_norm", 0.6, 0.9)
                    confidence = round(base_confidence * conf_roll, 2)
            else:
                noisy_val = true_val
                freshness = "live"
                conf_roll = DeterministicRNG.seeded_uniform("noise", seed + ":conf_live", 0.9, 1.0)
                confidence = round(base_confidence * conf_roll, 2)
                
            # Generate realistic ecosystem IDs based on the source
            source_id = f"{source}-eu-west-1" if source == "datadog" else f"{source}-cluster-01" if source == "kubernetes" else f"{source}-global"
            
            # Convert freshness into a realistic metric (collector lag)
            base_lag = DeterministicRNG.seeded_randint("noise", seed + ":lag", 10, 50)
            if is_stale:
                lag_ms = 90000 if freshness == "stale_90s" else DeterministicRNG.seeded_randint("noise", seed + ":degraded_lag", 5000, 30000)
            else:
                lag_ms = base_lag
                
            perceived_metrics[key] = {
                "value": noisy_val,
                "confidence": confidence,
                "freshness": freshness,
                "source_id": source_id,
                "collector_lag_ms": lag_ms
            }
            
        return perceived_metrics
