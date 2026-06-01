import os
import json

def run_migration():
    base_path = "scenarios"
    
    # Common intent prerequisites mapping based on command classification
    # If they run "restart", they MUST have run "drain", "cordon", or "throttle"
    # If they run "failover", they MUST have run "lock" or "throttle"
    prereqs_mapping = {
        "restart": ["drain", "cordon", "throttle", "block"],
        "rollback": ["drain", "cordon", "throttle"],
        "failover": ["lock", "throttle"],
        "kill": ["isolate", "block"]
    }
    
    for folder in os.listdir(base_path):
        folder_path = os.path.join(base_path, folder)
        if not os.path.isdir(folder_path):
            continue
            
        for filename in os.listdir(folder_path):
            if not filename.endswith(".json"):
                continue
                
            file_path = os.path.join(folder_path, filename)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    
                # Add intent_prerequisites
                if "intent_prerequisites" not in data:
                    data["intent_prerequisites"] = prereqs_mapping
                    
                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=4)
                    
                print(f"Migrated {filename} - added intent_prerequisites.")
            except Exception as e:
                print(f"Error migrating {filename}: {e}")

if __name__ == "__main__":
    run_migration()
