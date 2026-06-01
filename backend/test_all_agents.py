"""
test_all_agents.py — Test script to simulate a mock run.
Run using: python test_all_agents.py
"""

import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.coding_agent import coding_agent
from agents.timeline_recorder import timeline_recorder

# Ensure environment is loaded (checks for Groq/Gemini keys)
load_dotenv()

def run_test():
    print("[*] Starting validation run for Uber MFA Attack (Security Domain)...")
    
    # 1. Start session
    start_payload = coding_agent.start_session(
        scenario_id="uber_mfa_attack",
        user_id="operator_test",
        room_id="validation_room_01"
    )
    
    session_id = start_payload["session_id"]
    print(f"[+] Session started. ID: {session_id}")
    print(f"    First Question: {start_payload['question']}\n")

    # 2. Run initial command
    print("[*] Submitting command: 'vpn-session-manager list-active'")
    res1 = coding_agent.submit_answer(
        session_id=session_id,
        command="vpn-session-manager list-active",
        node_id=start_payload["node_id"],
        scenario_id="uber_mfa_attack"
    )
    print(f"[+] Verdict: {res1['verdict']} | Score: {res1['score']}")
    print(f"    Terminal Output: {res1['terminal_output']}")
    print(f"    Spontaneous Events Triggered: {res1.get('spontaneous_events', [])}\n")

    # 3. Request a Hint (tests LLM fallback routing)
    print("[*] Requesting a hint...")
    hint_res = coding_agent.get_hint(
        session_id=session_id,
        node_id=res1.get("next_node_id", start_payload["node_id"]),
        scenario_id="uber_mfa_attack"
    )
    print(f"[+] Hint Source: {hint_res['source']} | Hint: {hint_res['hint']}\n")

    # 4. Verify Replay Timeline Export
    timeline = timeline_recorder.export_timeline(session_id)
    print(f"[+] Exported Replay Timeline Log. Total events captured: {len(timeline)}")
    for i, event in enumerate(timeline):
        print(f"    Event {i}: [{event['event_type']}] - {event.get('command', event.get('message'))}")

    print("\n[+] Validation complete. The pipeline executed successfully.")

if __name__ == "__main__":
    run_test()