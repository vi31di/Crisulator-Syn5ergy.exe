from engine.canonical_state import CanonicalState
from engine.deterministic_rng import DeterministicRNG

class HumanErrorEngine:
    @staticmethod
    def calculate_mistake(state: CanonicalState) -> dict:
        """
        Determines if a spontaneous human error event occurs based on specific pressures.
        Mistakes are no longer random chaos, but deterministic consequences of fatigue,
        low confidence, or attention budget collapse.
        
        Returns a dictionary with spontaneous event info and a list of generated mutations.
        """
        fatigue = state.fatigue.get("cognitive_load", 0)
        attention = state.fatigue.get("attention_budget", 100)
        confidence = state.stakeholders.get("confidence", 100)
        
        seed = f"{state.id}:{state.timeline.get('tick_counter', 0)}"
        
        # 1. Tunnel Vision (High Fatigue, Low Attention)
        if fatigue > 85 and attention < 30:
            if DeterministicRNG.seeded_random("human_error", seed + "tunnel") < 0.2:
                return {
                    "event": {
                        "priority": "medium",
                        "type": "chat",
                        "sender": "Tech Lead",
                        "message": "I'm hyper-focusing on the deadlock traces because I'm exhausted. I can't look at anything else right now. You're on your own for the frontend latency."
                    },
                    "mutations": [{"domain": "fatigue", "key": "attention_budget", "value": 20, "operation": "sub"}]
                }
                
        # 2. Correct but Mis-timed (Low Confidence, Med Fatigue)
        if confidence < 40 and fatigue > 60:
            if DeterministicRNG.seeded_random("human_error", seed + "mistimed") < 0.2:
                return {
                    "event": {
                        "priority": "high",
                        "type": "chat",
                        "sender": "Teammate",
                        "message": "I didn't trust the stabilization, so I executed the rollback script. But I did it before the traffic drain completed. We just dropped active sessions."
                    },
                    "mutations": [{"domain": "infrastructure", "key": "latent_instability", "value": 30, "operation": "add"}]
                }
                
        # 3. Communication Breakdown (High Trust gap)
        public_trust = state.public_reaction.get("public_trust", 100)
        if public_trust < 50:
            if DeterministicRNG.seeded_random("human_error", seed + "comms") < 0.2:
                return {
                    "event": {
                        "priority": "critical",
                        "type": "chat",
                        "sender": "Manager",
                        "message": "I just told the CEO we'd be up in 5 minutes based on an old dashboard. If we aren't, my credibility is gone."
                    },
                    "mutations": [{"domain": "stakeholders", "key": "confidence", "value": 15, "operation": "sub"}]
                }
                
        # 4. Legal Overreach (Low alignment + Low Trust)
        alignment = state.stakeholders["beliefs"].get("alignment", 1.0)
        if alignment < 0.3 and public_trust < 60:
            if DeterministicRNG.seeded_random("human_error", seed + "legal") < 0.25:
                return {
                    "event": {
                        "priority": "high",
                        "type": "chat",
                        "sender": "Legal",
                        "message": "I am officially blocking any further public updates until I review every single log line. Do not post to the status page. Our coordination is too messy."
                    },
                    "mutations": []
                }
                
        return None
