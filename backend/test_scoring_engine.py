import os
import sys
from dotenv import load_dotenv

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agents.coding_agent import coding_agent, load_scenario
from agents.session_manager import session_manager
from agents.evaluator import evaluate_command
from main import generate_postmortem, PostmortemRequest

def test_scoring():
    print("[*] Starting Scoring Engine Verification Tests...")
    
    # Load scenario
    scenario = load_scenario("uber_mfa_attack")
    if not scenario:
        print("[-] Scenario not found.")
        return

    # Start session
    payload = coding_agent.start_session(
        scenario_id="uber_mfa_attack",
        user_id="scoring_tester",
        room_id="scoring_room"
    )
    session_id = payload["session_id"]
    session = session_manager.get_session(session_id)
    
    print(f"[+] Initial Session State:")
    print(f"    - Score: {session.score}")
    print(f"    - Blast Radius: {session.blast_radius}%")
    print(f"    - Recovery Delay: {session.recovery_delay} mins")
    print(f"    - Confidence Rating: {session.confidence_rating}%")
    print(f"    - Technical Accuracy: {session.category_technical_accuracy} / 25")
    print(f"    - Risk Management: {session.category_risk_management} / 15")
    
    # Assert initial values are perfect
    assert session.score == 0
    assert session.blast_radius == 50
    assert session.recovery_delay == 0
    assert session.confidence_rating == 100

    # 1. Run a correct diagnostic command (Investigation Quality & Technical Accuracy increase)
    print("\n[*] Running correct diagnostic command: 'vpn-session-manager list-active'")
    res = coding_agent.submit_answer(
        session_id=session_id,
        command="vpn-session-manager list-active",
        node_id=payload["node_id"],
        scenario_id="uber_mfa_attack"
    )
    print(f"[+] Post-Correct-Action State:")
    print(f"    - Score: {session.score}")
    print(f"    - Blast Radius: {session.blast_radius}%")
    print(f"    - Recovery Delay: {session.recovery_delay} mins")
    print(f"    - Confidence Rating: {session.confidence_rating}%")
    print(f"    - Technical Accuracy: {session.category_technical_accuracy} / 25")
    print(f"    - Investigation Quality: {session.category_investigation_quality} / 20")
    print(f"    - Recovery Effectiveness: {session.category_recovery_effectiveness} / 20")

    # 2. Run a bad command (Risk Management & SLA Protection decrease, Blast Radius increases, Recovery Delay increases)
    print("\n[*] Running BAD command: 'vpn-session-manager restart'")
    res2 = coding_agent.submit_answer(
        session_id=session_id,
        command="vpn-session-manager restart", # bad action synonym for restart/reboot under load
        node_id=res.get("next_node_id", payload["node_id"]),
        scenario_id="uber_mfa_attack"
    )
    print(f"[+] Post-Bad-Action State:")
    print(f"    - Score: {session.score}")
    print(f"    - Blast Radius: {session.blast_radius}%")
    print(f"    - Recovery Delay: {session.recovery_delay} mins")
    print(f"    - Confidence Rating: {session.confidence_rating}%")
    print(f"    - Technical Accuracy: {session.category_technical_accuracy} / 25")
    print(f"    - Risk Management: {session.category_risk_management} / 15")
    print(f"    - SLA Protection: {session.category_sla_protection} / 10")
    
    assert session.score < 100
    assert session.blast_radius > 50
    assert session.recovery_delay > 0
    assert session.confidence_rating < 100

    # 3. Request dynamic postmortem retrospective Markdown
    print("\n[*] Generating Dynamic Postmortem Report...")
    import asyncio
    req = PostmortemRequest(
        scenario_id="uber_mfa_attack",
        actions=session.completed_actions,
        timeline=[],
        score=session.score,
        role="security"
    )
    postmortem_res = asyncio.run(generate_postmortem(req))
    markdown_report = postmortem_res["postmortem"]
    
    print("\n[+] Dynamic Score Retrospective Breakdown (Safe Print):")
    print("--------------------------------------------------")
    try:
        print(markdown_report.encode(sys.stdout.encoding or "utf-8", errors="replace").decode(sys.stdout.encoding or "utf-8"))
    except Exception as e:
        print(f"Postmortem report preview omitted due to stdout encoding constraint: {e}")
    print("--------------------------------------------------")
    
    print("\n[+] Scoring and Postmortem Engine validation successful!")

if __name__ == "__main__":
    test_scoring()
