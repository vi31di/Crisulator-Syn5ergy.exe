import json
import random
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ai_client import ask_ai

class TelemetryGenerator:
    @staticmethod
    def generate_procedural_topology(archetype: dict, flavorpack: dict) -> dict:
        """
        Procedurally maps semantic archetype topology to specific flavorpack services.
        """
        topology = archetype.get("topology", {})
        mappings = flavorpack.get("semantic_mappings", {})
        
        trigger = mappings.get(topology.get("trigger_service"), topology.get("trigger_service"))
        affected = [mappings.get(s, s) for s in topology.get("affected_services", [])]
        
        return {
            "trigger_service": trigger,
            "affected_services": affected
        }
        
    @staticmethod
    def generate_llm_flavor(root_cause: str, topology: dict, flavorpack: dict) -> dict:
        """
        Calls the local LLM to generate realistic log cascades.
        """
        jargon = ", ".join(flavorpack.get("operational_jargon", []))
        vendor = flavorpack.get("vendor", "Generic")
        
        prompt = f"""
You are an expert Site Reliability Engineer generating realistic telemetry for an incident simulator.
The scenario root cause is: {root_cause}
Vendor Environment: {vendor}
Trigger Service: {topology.get("trigger_service")}
Affected Services: {", ".join(topology.get("affected_services", []))}
Operational Jargon to include: {jargon}

Generate a JSON object with TWO keys:
1. "initial_logs": A list of 2-3 strings representing the first vague logs seen at detection.
2. "evolving_logs": A list of 4-6 strings representing cascading errors as the incident worsens.

Make the logs look like real terminal/syslog output (timestamps not necessary, just the raw log message).
Return ONLY the raw JSON.
"""
        try:
            res = ask_ai([{"role": "system", "content": "You output JSON only."}, {"role": "user", "content": prompt}])
            clean_res = res.strip()
            if clean_res.startswith("```json"):
                clean_res = clean_res[7:]
            if clean_res.endswith("```"):
                clean_res = clean_res[:-3]
            return json.loads(clean_res.strip())
        except Exception as e:
            print(f"[Warning] LLM telemetry generation failed: {e}. Falling back to procedural.")
            return {
                "initial_logs": [f"WARN [{topology.get('trigger_service')}] Healthcheck failed."],
                "evolving_logs": [f"ERROR [{s}] Connection timeout." for s in topology.get("affected_services", [])]
            }
