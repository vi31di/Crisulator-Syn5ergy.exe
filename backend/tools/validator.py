import json
import yaml

class ScenarioValidator:
    @staticmethod
    def load_file(filepath: str):
        with open(filepath, 'r') as f:
            if filepath.endswith('.yaml') or filepath.endswith('.yml'):
                return yaml.safe_load(f)
            return json.load(f)

    @staticmethod
    def validate_canonical(filepath: str):
        print(f"[*] Validating Canonical Artifact: {filepath}")
        data = ScenarioValidator.load_file(filepath)
        
        errors = []
        warnings = []
        
        # Structural Checks
        if "id" not in data: errors.append("Missing required field: id")
        if "phases" not in data: errors.append("Missing phases definition")
        if "mitigation_path" not in data or not data["mitigation_path"]: errors.append("Missing or empty mitigation_path")
        
        prereqs = data.get("intent_prerequisites", {})
        for action, reqs in prereqs.items():
            for r in reqs:
                if r in prereqs and action in prereqs[r]:
                    errors.append(f"Cyclic prerequisite detected: {action} <-> {r}")
                    
        # Psychological / Emotional Rhythm Checks
        phases = data.get("phases", {})
        has_calm = False
        has_escalation = False
        
        for p_name, p_data in phases.items():
            multiplier = p_data.get("metric_multiplier", 1.0)
            if multiplier <= 0.5:
                has_calm = True
            if multiplier >= 1.5:
                has_escalation = True
                
        if not has_calm:
            warnings.append("Psychological Warning: No calm/false recovery phase detected. The pacing may become monotonous and exhausting.")
        if not has_escalation:
            warnings.append("Psychological Warning: No escalation spike detected. Scenario lacks a climax.")
            
        # Replay Safety
        if "schema_version" not in data and "schema_version" not in data.get("metadata", {}):
            warnings.append("Replay Warning: Missing schema_version. Future backwards compatibility is at risk.")

        if errors:
            print("\n[!] FATAL ERRORS:")
            for e in errors: print(f"  - {e}")
            return False
            
        if warnings:
            print("\n[!] LINT/WARNINGS:")
            for w in warnings: print(f"  - {w}")
            
        print(f"\n[+] Validation complete: {filepath} is valid.")
        return True
