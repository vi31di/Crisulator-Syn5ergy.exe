from engine.canonical_state import CanonicalState
import json

class OutputRenderer:
    @staticmethod
    def render(state: CanonicalState, command: str, scenario: dict, classification: str, discovery_msg: str) -> str:
        """
        Renders the final terminal output string.
        """
        out = []
        if discovery_msg:
            out.append(discovery_msg)
            out.append("--------------------------------------------------")
            
        health = state.infrastructure["health"]
        
        # Scenario specific templates
        templates = scenario.get("terminal_templates", {})
        
        if classification == "diagnostic":
            if "diagnostic" in templates:
                out.append(templates["diagnostic"].replace("{health}", str(health)))
            else:
                out.append(f"Diagnostics complete. Current infrastructure health index: {health}%.")
                if health < 50:
                    out.append("CRITICAL: Multiple services failing health checks.")
                    
        elif classification == "mitigation":
            if "mitigation" in templates:
                out.append(templates["mitigation"])
            else:
                out.append("Mitigation action deployed. Traffic routing updated.")
                
        elif classification == "recovery":
            if "recovery" in templates:
                out.append(templates["recovery"])
            else:
                out.append("Recovery sequence initiated. Watch telemetry for stabilization.")
                
        elif classification == "destructive":
            out.append("WARNING: Destructive action executed.")
            out.append("System stability compromised.")
            
        return "\n".join(out)
