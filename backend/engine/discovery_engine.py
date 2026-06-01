from engine.canonical_state import CanonicalState

class DiscoveryEngine:
    @staticmethod
    def process(state: CanonicalState, command: str, scenario: dict) -> str:
        """
        Evaluates graph-based discovery nodes.
        """
        discovery_tree = scenario.get("discovery_tree", [])
        if not discovery_tree:
            return ""
            
        for node in discovery_tree:
            node_id = node.get("id")
            if node_id in state.discovery["nodes"]:
                continue
                
            trigger_cmd = node.get("trigger_command", "")
            if trigger_cmd in command:
                reqs = node.get("requires", [])
                can_unlock = all(r in state.discovery["nodes"] for r in reqs)
                
                if can_unlock:
                    state.discovery["nodes"].append(node_id)
                    # Add to narrative theories if discovery provides context
                    if "theory" in node.get("text", "").lower():
                        state.narrative["disproven_theories"].append(state.narrative["dominant_theory"])
                        state.narrative["dominant_theory"] = "Unknown"
                    return f"DISCOVERY UNLOCKED: {node.get('text', '')}"
                    
        return ""
