class NarrativeCohesionEngine:
    @staticmethod
    def process(state):
        """
        Synchronizes all perception systems around the same evolving operational truth.
        Outputs tone shifts, telemetry mood, and UI pacing. 
        DOES NOT invent state.
        """
        instability = state.infrastructure.get("latent_instability", 0)
        fatigue = state.fatigue.get("cognitive_load", 0)
        silence_type = state.infrastructure.get("silence_window", {}).get("type", "none")
        health = state.infrastructure.get("health", 100)
        
        # Determine Telemetry Mood (How should graphs/metrics feel?)
        if silence_type == "catastrophic_silence":
            mood = "frozen"
        elif silence_type == "telemetry_desync":
            mood = "contradictory"
        elif instability > 70:
            mood = "flickering"
        elif health < 40:
            mood = "degraded"
        else:
            mood = "stable"
            
        # Determine NPC Tone Shift
        if silence_type == "executive_silence":
            npc_tone = "formal_dread"
        elif fatigue > 80:
            npc_tone = "exhausted_sharp"
        elif instability > 50:
            npc_tone = "anxious_skeptical"
        elif health > 80:
            npc_tone = "cautious_optimism"
        else:
            npc_tone = "neutral_analytical"
            
        # UI Pacing (How fast should things update visually)
        ui_pacing = "chaotic_fast" if state.timeline.get("tempo") == "chaos" else "slow_dread" if silence_type != "none" else "normal"
        
        # Do not mutate CanonicalState directly using target[key] += value!
        # Just update the existing narrative dictionary which is a safe read-only projection attribute
        state.narrative["telemetry_mood"] = mood
        state.narrative["npc_tone_shift"] = npc_tone
        state.narrative["ui_pacing"] = ui_pacing
        
        # We also synthesize a single coherent 'theme' for the frontend to digest easily
        if mood == "frozen" and npc_tone == "formal_dread":
            theme = "impending_doom"
        elif mood == "contradictory" and npc_tone == "anxious_skeptical":
            theme = "total_confusion"
        elif mood == "stable" and npc_tone == "cautious_optimism":
            theme = "fragile_recovery"
        else:
            theme = "active_firefighting"
            
        state.narrative["cohesion_theme"] = theme
