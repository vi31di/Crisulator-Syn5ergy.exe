import time
from typing import List, Dict, Any

class WorldState:
    def __init__(self, scenario_id: str):
        self.scenario_id = scenario_id
        
        # Central Canonical State
        self.infra_health: int = 100
        self.customer_impact: int = 0
        self.stakeholder_confidence: int = 80
        self.public_trust: int = 90
        self.legal_risk: int = 0
        self.political_capital: int = 100
        
        self.active_phase: str = "detection"
        self.mitigation_progress: int = 0
        
        self.systems_down: List[str] = []
        self.systems_degraded: List[str] = []
        self.unresolved_alerts: List[str] = []
        
        # Graph-based discovery tree (strings of discovered node IDs)
        self.discovered_nodes: List[str] = []
        
        # History & Promises
        self.executed_actions: List[str] = []
        self.incident_memory: List[str] = []
        self.timeline: List[str] = []
        self.planned_actions: List[str] = []
        self.committed_strategy: str = ""
        self.promise_violations: int = 0
        
        # Delayed consequence queue. Each dict contains: timestamp, type, value, description
        self.delayed_events: List[Dict[str, Any]] = []

        # Terminal specific trackers
        self.command_cooldowns: Dict[str, float] = {}
        
    def dict(self):
        return {
            "infra_health": self.infra_health,
            "customer_impact": self.customer_impact,
            "stakeholder_confidence": self.stakeholder_confidence,
            "public_trust": self.public_trust,
            "legal_risk": self.legal_risk,
            "political_capital": self.political_capital,
            "active_phase": self.active_phase,
            "mitigation_progress": self.mitigation_progress,
            "systems_down": self.systems_down,
            "systems_degraded": self.systems_degraded,
            "unresolved_alerts": self.unresolved_alerts,
            "discovered_nodes": self.discovered_nodes,
            "executed_actions": self.executed_actions,
            "incident_memory": self.incident_memory,
            "timeline": self.timeline,
            "planned_actions": self.planned_actions,
            "committed_strategy": self.committed_strategy,
            "promise_violations": self.promise_violations,
            "delayed_events": self.delayed_events,
            "command_cooldowns": self.command_cooldowns
        }

    @staticmethod
    def from_dict(data: dict, scenario_id: str):
        state = WorldState(scenario_id)
        for key, value in data.items():
            if hasattr(state, key):
                setattr(state, key, value)
        return state
