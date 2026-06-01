"""
Syn5ergy v2 Core Engine - SimulationOrchestrator
Enforces strict 10-step Engine Ordering rules, type-safe rollbacks on invariant failure, 
and accurate causal lineage tracing by isolating mutations per intent block.
"""
from engine.canonical_state import CanonicalState
from engine.fatigue_engine import FatigueEngine
from engine.emotion_engine import EmotionEngine
from engine.event_decay_engine import EventDecayEngine
from engine.human_error_engine import HumanErrorEngine
from engine.escalation_engine import EscalationEngine
from engine.narrative_state import NarrativeEngine  # FIX 2: Corrected module import path handle
from engine.mutation_applier import MutationApplier
from engine.narrative_cohesion_engine import NarrativeCohesionEngine
from engine.kernel_invariants import KernelInvariants, InvariantViolation
from engine.state_manager import StateManager
from engine.state_operations import StateOperations
import os
import copy
import time

DEBUG_TRACE_MODE = os.environ.get("DEBUG_TRACE_MODE", "False") == "True"

class SimulationOrchestrator:
    @staticmethod
    def tick(state: CanonicalState, is_preemption: bool = False) -> list[dict]: # FIX 10: Fixed return typing mismatch constraints
        """
        The central emergent heartbeat.
        Strictly enforces the 10-step Engine Ordering rule.
        No direct mutation allowed outside MutationApplier.
        """
        # FIX 7: Added is_preemption check to block catastrophic priority thread deadlocks
        if not is_preemption and not StateManager.acquire_tick_lock(state.scenario_id):
            if DEBUG_TRACE_MODE: 
                print("[WARNING] Non-preemptive tick already in progress. Aborting overlapping thread execution.")
            return []
            
        # FIX 3: Type-safe snapshot caching using direct object duplication to protect method validation bindings
        rollback_state = copy.deepcopy(state)
        
        try:
            KernelInvariants.validate(state)
            
            if not is_preemption:
                c1 = MutationApplier.commit(state, [{"domain": "timeline", "key": "tick_counter", "value": 1, "operation": "add"}], intent_id="sys_tick", causal_chain_hash=f"sys_tick_{state.timeline.get('tick_counter', 0)}")
                StateOperations.append_causality(state, c1)
                
            current_tick = state.timeline.get("tick_counter", 1)
            spontaneous_events = []
            
            # Determine Pacing/Tempo context and mutate safely using the Applier framework
            calculated_tempo = "normal"
            if state.infrastructure.get("health", 100) < 30:
                calculated_tempo = "chaos"
            elif state.infrastructure.get("silence_window", {}).get("ticks", 0) > 0:
                calculated_tempo = "eerie_silence"
                # FIX 9: Decrement our active on-call silence tracking clock loops cleanly inside the core orchestrator tick
                c2 = MutationApplier.commit(state, [{"domain": "infrastructure", "key": "silence_window", "sub_key": "ticks", "value": 1, "operation": "sub"}], intent_id="sys_silence", causal_chain_hash=f"sys_silence_{current_tick}")
                StateOperations.append_causality(state, c2)
            elif state.infrastructure.get("latent_instability", 0) > 50:
                calculated_tempo = "unstable_recovery"
                
            c3 = MutationApplier.commit(state, [{"domain": "timeline", "key": "tempo", "value": calculated_tempo, "operation": "set"}], intent_id="sys_tempo", causal_chain_hash=f"sys_tempo_{current_tick}")
            StateOperations.append_causality(state, c3)
            
            if DEBUG_TRACE_MODE:
                print(f"--- STARTING SIMULATION TICK: {current_tick} (Preemption: {is_preemption}) ---")

            # ─── STEP 1: DECAY ──────────────────────────────────────────────────────────
            decay_mutations = EventDecayEngine.process(state)
            StateOperations.enqueue_mutations(state, decay_mutations)
            
            # ─── STEP 2: FATIGUE ────────────────────────────────────────────────────────
            fatigue_mutations = FatigueEngine.process(state)
            StateOperations.enqueue_mutations(state, fatigue_mutations)
            
            # ─── STEP 3: EMOTIONAL PROPAGATION ──────────────────────────────────────────
            emotion_mutations = EmotionEngine.process_stress_propagation(state)
            StateOperations.enqueue_mutations(state, emotion_mutations)
            
            # ─── STEP 4 & 5: INTENT INTERPRETATION & CAUSAL MUTATION MATRIX GENERATION ──
            for intent in list(state.intent_queue):
                # FIX 5: Isolated local mutation list instantiated per intent to block cross-action leakage
                local_intent_mutations = []
                
                # Evaluate Viability
                infra_factor = (state.infrastructure.get("health", 100) / 100.0) * 0.3
                coord_factor = intent.get("coordination_level", 0.5) * 0.2
                confidence_factor = intent.get("confidence", 0.5) * 0.2
                
                # FIX 4: Implemented safe denominator math to secure lookups against zero-division loops
                tool_metrics = state.tool_reputation.get("datadog", {})
                tool_trust_avg = sum(tool_metrics.values()) / max(len(tool_metrics), 1) if tool_metrics else 1.0
                tool_factor = tool_trust_avg * 0.1
                fatigue_penalty = (state.fatigue.get("cognitive_load", 0) / 100.0) * 0.2
                
                operational_viability = infra_factor + coord_factor + confidence_factor + tool_factor - fatigue_penalty
                
                operation_complexity = {
                    "diagnostic": {"threshold": 0.2, "technical_risk": 0.1, "blast_radius": 0.1},
                    "mitigation": {"threshold": 0.4, "technical_risk": 0.5, "blast_radius": 0.4},
                    "recovery":   {"threshold": 0.6, "technical_risk": 0.8, "blast_radius": 0.8},
                    "destructive":{"threshold": 0.7, "technical_risk": 0.9, "blast_radius": 1.0},
                }
                
                complexity = operation_complexity.get(intent.get("action"), operation_complexity["diagnostic"])
                is_successful = operational_viability >= complexity["threshold"]
                
                if intent.get("intent_failed", False):
                    is_successful = False
                    
                contributing_factors = []
                if state.fatigue.get("cognitive_load", 0) > 70: contributing_factors.append("High cognitive fatigue")
                if state.infrastructure.get("latent_instability", 0) > 50: contributing_factors.append("Latent instability destabilized execution")
                if tool_trust_avg < 0.5: contributing_factors.append("Low observability confidence")
                
                narrative = ""
                if intent.get("intent_failed", False):
                    narrative = f"Failed intent prerequisites: {intent.get('intent_reason', '')}"
                    local_intent_mutations.append({"domain": "infrastructure", "key": "health", "value": 40, "operation": "sub"})
                    local_intent_mutations.append({"domain": "infrastructure", "key": "silence_window", "value": {"type": "catastrophic_silence", "ticks": 4}, "operation": "set"})
                elif is_successful and intent.get("action") == "recovery":
                    narrative = "Recovery command executed successfully, but generated recovery debt."
                    local_intent_mutations.append({"domain": "infrastructure", "key": "health", "value": 20, "operation": "add"})
                    local_intent_mutations.append({"domain": "infrastructure", "key": "recovery_debt", "value": 40, "operation": "add"})
                elif not is_successful and intent.get("action") in ["recovery", "mitigation", "destructive"]:
                    narrative = f"Command failed due to operational friction. (Viability: {operational_viability:.2f} vs Required: {complexity['threshold']:.2f})"
                    local_intent_mutations.append({"domain": "infrastructure", "key": "health", "value": 10, "operation": "sub"})
                    local_intent_mutations.append({"domain": "stakeholders", "key": "confidence", "value": 10, "operation": "sub"})
                else:
                    narrative = f"Executed {intent.get('action')} command with neutral operational impact."
                    if intent.get("action") == "mitigation":
                        local_intent_mutations.append({"domain": "timeline", "key": "mitigation_progress", "value": 20, "operation": "add"})
                        
                if not is_successful and intent.get("action") == "destructive":
                    local_intent_mutations.append({"domain": "tool_reputation", "key": "datadog", "sub_key": "accuracy", "value": 0.2, "operation": "sub"})
                    
                # Store immutable tracking resolutions inside deep payload caches
                resolution = {
                    "intent_id": intent.get("id"),
                    "tick": current_tick,
                    "final_narrative": narrative,
                    "contributing_factors": contributing_factors,
                    "operational_viability": round(operational_viability, 2)
                }
                
                # Commit local intent metrics explicitly under their specific lineage hash scopes
                causal_hash = f"chain_{current_tick}_{intent.get('id', 'unknown')}"
                if local_intent_mutations:
                    causality_entries = MutationApplier.commit(
                        state, 
                        local_intent_mutations, 
                        intent_id=intent.get('id'), 
                        causal_chain_hash=causal_hash
                    )
                    
                    if causality_entries:
                        causality_entries[0]["human_reason"] = resolution["final_narrative"]
                        causality_entries[0]["contributing_factors"] = resolution["contributing_factors"]
                        causality_entries[0]["operational_viability"] = resolution["operational_viability"]
                        
                    StateOperations.append_causality(state, causality_entries)
                
                state.resolution_records.append(resolution)
                StateOperations.archive_intent(state, intent.get("id"))

            # ─── STEP 6: MUTATION COMMIT (Flush background system actions) ──────────────
            if state.mutation_queue:
                causality_entries = MutationApplier.commit(
                    state, 
                    state.mutation_queue, 
                    intent_id="system_tick", 
                    causal_chain_hash=f"sys_{current_tick}"
                )
                StateOperations.append_causality(state, causality_entries)
                StateOperations.clear_mutations(state)
            
            # ─── STEP 7: NARRATIVE UPDATE ───────────────────────────────────────────────
            NarrativeEngine.process_narrative(state)
            NarrativeCohesionEngine.process(state)
            
            # ─── STEP 8: TELEMETRY PROJECTION ───────────────────────────────────────────
            # Compiled outside frame boundaries inside global main routing loops.
            
            # ─── STEP 9: SPONTANEOUS EVENTS ─────────────────────────────────────────────
            error_event_payload = HumanErrorEngine.calculate_mistake(state)
            if error_event_payload:
                if "event" in error_event_payload:
                    spontaneous_events.append(error_event_payload["event"])
                if "mutations" in error_event_payload:
                    StateOperations.enqueue_mutations(state, error_event_payload["mutations"])
                
            escalations = EscalationEngine.process_clock_pressure(state)
            if escalations:
                for esc in escalations:
                    spontaneous_events.append({
                        "priority": "critical",
                        "type": "chat",
                        "sender": "Executive",
                        "message": esc
                    })
                    StateOperations.enqueue_mutations(state, [
                        {"domain": "fatigue", "key": "attention_budget", "value": 10, "operation": "sub"},
                        {"domain": "fatigue", "key": "cognitive_load", "value": 5, "operation": "add"}
                    ])
                    
            silence_type = state.infrastructure.get("silence_window", {}).get("type", "none")
            if silence_type != "none":
                if silence_type == "catastrophic_silence":
                    spontaneous_events = []
                elif silence_type == "executive_silence":
                    spontaneous_events = [e for e in spontaneous_events if e.get("sender") != "Executive"]
                elif silence_type == "uneasy_quiet" and current_tick % 3 != 0:
                    spontaneous_events = []
                    
            # Calculate dynamic platform verification alignment indices cleanly
            tool_metrics = state.tool_reputation.get("datadog", {})
            tool_trust_score = sum(tool_metrics.values()) / max(len(tool_metrics), 1) if tool_metrics else 1.0
            integrity = 100
            integrity -= (100 - state.infrastructure.get("health", 100)) * 0.2
            integrity -= state.infrastructure.get("latent_instability", 0) * 0.3
            integrity -= (1.0 - tool_trust_score) * 20
            
            StateOperations.set_integrity_score(state, max(0, min(100, int(integrity))))
            
            # ─── STEP 10: SNAPSHOT SAVE ─────────────────────────────────────────────────
            is_full_snapshot = (current_tick % 10 == 0) or current_tick == 1
            snapshot = {
                "schema_version": "1.0.0",
                "tick": current_tick,
                "tempo": state.timeline.get("tempo", "normal"),
                "health": state.infrastructure.get("health", 100),
                "integrity_score": state.simulation_integrity_score
            }
            if is_full_snapshot:
                # FIX 8: Enforced deepcopy boundaries on snapshot data mapping hooks to isolate historical values
                snapshot.update({
                    "latent_instability": copy.deepcopy(state.infrastructure.get("latent_instability", 0)),
                    "confidence": copy.deepcopy(state.stakeholders.get("confidence", 100)),
                    "dominant_theory": copy.deepcopy(state.narrative.get("dominant_theory", "none")),
                    "mitigation_progress": copy.deepcopy(state.timeline.get("mitigation_progress", 0))
                })
            StateOperations.append_snapshot(state, snapshot)
                
            KernelInvariants.validate(state)
            return spontaneous_events
            
        except InvariantViolation as e:
            if DEBUG_TRACE_MODE: 
                print(f"[CRITICAL STATE CORRUPTION] Invariant Violation caught during processing: {e}. Executing atomic rollback sequence.")
            
            # Atomic structural reconstruction using the uncorrupted object dictionary snapshot data records
            state.__dict__.update(copy.deepcopy(rollback_state.__dict__))
            
            return [{
                "priority": "critical", 
                "type": "chat", 
                "sender": "SYSTEM", 
                "message": f"CRITICAL CONSOLE EXCEPTION: Core simulation validation boundary breached. State history rolled back dynamically. Trace context: {e}"
            }]
            
            
        finally:
            if not is_preemption:
                StateManager.release_tick_lock(state.scenario_id)