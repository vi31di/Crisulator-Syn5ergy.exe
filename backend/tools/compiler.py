import yaml
import json
import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from tools.telemetry_gen import TelemetryGenerator

class ScenarioCompiler:
    @staticmethod
    def load_yaml(filepath: str) -> dict:
        with open(filepath, 'r') as f:
            return yaml.safe_load(f)

    @staticmethod
    def compile(source_path: str, output_path: str):
        print(f"[*] Compiling source: {source_path}")
        source = ScenarioCompiler.load_yaml(source_path)
        
        archetype_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "archetypes", f"{source.get('archetype')}.yaml")
        flavor_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "flavorpacks", f"{source.get('flavorpack')}.yaml")
        
        archetype = ScenarioCompiler.load_yaml(archetype_path)
        flavor = ScenarioCompiler.load_yaml(flavor_path)
        
        print("[*] Generating semantic topology...")
        topology = TelemetryGenerator.generate_procedural_topology(archetype, flavor)
        
        print("[*] Contacting LLM for telemetry flavor...")
        telemetry = TelemetryGenerator.generate_llm_flavor(source.get("root_cause", ""), topology, flavor)
        
        print("[*] Assembling Canonical JSON...")
        # Start constructing the canonical schema expected by the orchestrator
        scenario = {
            "schema_version": source.get("schema_version", "1.0.0"),
            "id": source.get("id"),
            "title": source.get("title"),
            "severity": source.get("severity"),
            "service": topology.get("trigger_service"),
            "description": source.get("description", "A complex outage event."),
            "root_cause": source.get("root_cause"),
            
            # Hybrid Telemetry
            "initial_logs": telemetry.get("initial_logs", []),
            "evolving_logs": telemetry.get("evolving_logs", []),
            
            # Structural Pacing
            "phases": archetype.get("pacing", {}),
            "intent_prerequisites": archetype.get("intent_prerequisites", {}),
            "mitigation_path": archetype.get("mitigation_path", []),
            "incorrect_action_consequences": archetype.get("incorrect_action_consequences", {}),
            
            # Flavorpack Overrides
            "scenario_specific_outputs": flavor.get("realistic_stack_traces", {}),
            "sandbox": {
                "language": "bash",
                "template": flavor.get("sandbox_template", "")
            },
            
            # Modifiers & Stakeholders
            "stakeholder_personalities": source.get("stakeholder_profile", {}),
            "modifiers": source.get("modifiers", {})
        }
        
        # Add basic defaults if missing
        if "metrics" not in scenario:
            scenario["metrics"] = {
                "error_rate": 80,
                "p95_latency": 4500,
                "db_connections": 10,
                "cpu": 90
            }
            
        with open(output_path, 'w') as f:
            json.dump(scenario, f, indent=4)
            
        print(f"[+] Successfully compiled canonical scenario to: {output_path}")
        return scenario
