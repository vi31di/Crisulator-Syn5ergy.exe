from typing import List, Dict, Any
import time

SCHEMA_FROZEN = True # Architecture churn is complete. No new telemetry/engines.

class CanonicalState:
    """
    The Single Source of Objective Reality.
    Divided strictly into domain-specific dictionaries.
    """
    def __init__(self, scenario_id: str):
        self.scenario_id = scenario_id
        self.id = scenario_id
        self.start_time = time.time()
        self.simulation_integrity_score = 100
        
        # DOMAIN: Infrastructure Reality
        self.infrastructure = {
            "health": 100,           # 0-100
            "systems_down": [],
            "systems_degraded": [],
            "latent_instability": 0, # "False Recovery" metric. Builds up if retries explode.
            "recovery_debt": 0,      # Temporary fixes that will eventually convert to latent_instability
            "silence_window": {"type": "none", "ticks": 0} # types: uneasy_quiet, telemetry_desync, executive_silence, catastrophic_silence
        }
        
        # DOMAIN: Stakeholder Emotion & Politics
        self.stakeholders = {
            "confidence": 80,
            "stress_levels": {
                "manager": 10, "cto": 5, "teammate": 5, "lead": 10, "legal": 0, "client": 0
            },
            "beliefs": {
                "alignment": 0.5,
                "predictability": 0.5,
                "ownership": 0.5,
                "escalation_discipline": 0.5,
                "communication_consistency": 0.5
            },
            "executive_memory": [],  # Raw statements for quotes
        }
        
        # DOMAIN: Public & External Reaction
        self.public_reaction = {
            "public_trust": 90,
            "customer_impact": 0,
            "legal_risk": 0
        }
        
        # DOMAIN: Incident Progress & Pacing
        self.timeline = {
            "active_phase": "detection",
            "tempo": "normal",       # normal, eerie_silence, chaos, recovery
            "tick_counter": 0,
            "mitigation_progress": 0,
            "logs": [],              # Raw true chronological logs
            "events": []             # Spontaneous simulation events
        }
        
        # DOMAIN: Player Cognitive & Attention Load
        self.fatigue = {
            "attention_budget": 100, # Drops as tasks pile up
            "cognitive_load": 0,
            "ui_penalty": 0          # Drives frontend noise
        }
        
        # DOMAIN: Command History & Discovery
        self.discovery = {
            "nodes": [],             # Graph nodes unlocked
            "executed_actions": [],
            "planned_actions": [],
            "committed_strategy": ""
        }
        
        # DOMAIN: Master Event & Mutation Queues
        self.intent_queue = []       # Rich intents awaiting interpretation (immutable once added)
        self.resolution_records = [] # Historical records of resolved intents
        self.mutation_queue = []     # Pending state changes sorted by priority
        self.delayed_events = []     # Chronological delayed consequences
        self.causality_log = []      # Immutable record of why state mutated
        
        # DOMAIN: Tool Reputation (Dimensional Trust)
        self.tool_reputation = {
            "datadog": {"accuracy": 0.8, "freshness": 0.8, "coverage": 0.9},
            "kubernetes": {"accuracy": 0.9, "freshness": 0.9, "coverage": 0.8},
            "grafana": {"accuracy": 0.7, "freshness": 0.6, "coverage": 0.7}
        }
        
        # DOMAIN: Epistemology
        self.known_unknowns = []     # List of unresolved mysteries (e.g. "unexplained auth spike")
        
        # DOMAIN: Snapshots
        self.state_snapshots = []    # Delta-compressed historical states
        
        # DOMAIN: Narrative Theory
        self.narrative = {
            "dominant_theory": "Unknown",
            "disproven_theories": []
        }

    def dict(self):
        return {
            "scenario_id": self.scenario_id,
            "id": self.id,
            "infrastructure": self.infrastructure,
            "stakeholders": self.stakeholders,
            "public_reaction": self.public_reaction,
            "timeline": self.timeline,
            "fatigue": self.fatigue,
            "discovery": self.discovery,
            "intent_queue": self.intent_queue,
            "mutation_queue": self.mutation_queue,
            "narrative": self.narrative,
            "delayed_events": self.delayed_events,
            "resolution_records": self.resolution_records,
            "tool_reputation": self.tool_reputation,
            "causality_log": self.causality_log,
            "known_unknowns": self.known_unknowns,
            "state_snapshots": self.state_snapshots,
            "simulation_integrity_score": self.simulation_integrity_score
        }

    @staticmethod
    def from_dict(data: dict, scenario_id: str):
        state = CanonicalState(scenario_id)
        for key, value in data.items():
            if hasattr(state, key):
                setattr(state, key, value)
        return state
