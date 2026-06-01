from engine.canonical_state import CanonicalState
from engine.deterministic_rng import DeterministicRNG

class EscalationEngine:
    @staticmethod
    def process_clock_pressure(state: CanonicalState) -> list:
        """
        Mutates metrics based purely on time delays (Clock Pressure).
        Returns a list of executive interrupts or narrative escalations.
        """
        interrupts = []
        
        seed = f"{state.id}:{state.timeline.get('tick_counter', 0)}"
        
        # If incident has been in investigation/detection for a long time
        if state.timeline["active_phase"] in ["detection", "investigation"] and len(state.discovery["executed_actions"]) > 5:
            if DeterministicRNG.seeded_random(seed + "esc_exec") < 0.2:  # 20% chance of interrupt when stalled
                interrupts.append(
                    "CEO [INTERRUPT]: 'Why are we still investigating? Finance estimates $240k/minute impact. I need an ETA immediately.'"
                )
                
        # If legal risk is high or public trust is low
        if state.public_reaction["public_trust"] < 50:
            if DeterministicRNG.seeded_random(seed + "esc_legal") < 0.3:
                interrupts.append(
                    "LEGAL [INTERRUPT]: 'Social media complaints are trending. Have we confirmed if customer data was exposed? We are legally required to disclose within 2 hours.'"
                )
                
        return interrupts
