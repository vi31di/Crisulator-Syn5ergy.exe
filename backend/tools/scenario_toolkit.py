import argparse
import sys
import os

from compiler import ScenarioCompiler
from validator import ScenarioValidator

def main():
    parser = argparse.ArgumentParser(description="SYN5ERGY Scenario Authoring Toolkit")
    subparsers = parser.add_subparsers(dest="command", required=True)
    
    # Compile
    compile_parser = subparsers.add_parser("compile", help="Compile a scenario source YAML into canonical JSON")
    compile_parser.add_argument("source", help="Path to source YAML")
    compile_parser.add_argument("--out", default=None, help="Output JSON path")
    
    # Validate
    validate_parser = subparsers.add_parser("validate", help="Validate a canonical scenario JSON")
    validate_parser.add_argument("file", help="Path to scenario JSON or YAML")
    
    # Doctor
    doctor_parser = subparsers.add_parser("doctor", help="Run validation and quality analysis on a source YAML")
    doctor_parser.add_argument("source", help="Path to source YAML")
    
    args = parser.parse_args()
    
    if args.command == "compile":
        out_path = args.out
        if not out_path:
            filename = os.path.basename(args.source).replace(".yaml", ".json").replace(".yml", ".json")
            out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scenarios", "swe", filename)
        
        ScenarioCompiler.compile(args.source, out_path)
        
    elif args.command == "validate":
        ScenarioValidator.validate_canonical(args.file)
        
    elif args.command == "doctor":
        print(f"[*] Running SYN5ERGY Doctor on {args.source}")
        print("  [1] Validating raw source format...")
        try:
            ScenarioValidator.load_file(args.source)
        except Exception as e:
            print(f"  [!] Failed to parse source: {e}")
            sys.exit(1)
            
        print("  [2] Dry-run compiling...")
        temp_out = args.source + ".tmp.json"
        try:
            ScenarioCompiler.compile(args.source, temp_out)
            print("  [3] Validating compiled output...")
            ScenarioValidator.validate_canonical(temp_out)
        finally:
            if os.path.exists(temp_out):
                os.remove(temp_out)
                
        print("\n[+] Doctor analysis complete.")

if __name__ == "__main__":
    main()
