"""
coding_sandbox.py — Route handler for the adaptive coding sandbox.

Plug this into your existing routes/ folder.
Works with both Flask and FastAPI — see comments below.

Endpoints:
  POST /api/sandbox/start              → start a new adaptive session
  POST /api/sandbox/submit             → submit a command/answer
  GET  /api/sandbox/hint               → request a hint
  GET  /api/sandbox/status/<session_id>→ get session performance
  DELETE /api/sandbox/session/<sid>    → end/abandon session
"""

# ════════════════════════════════════════════════════════════════════
# FASTAPI VERSION (use this if your main.py uses FastAPI)
# ════════════════════════════════════════════════════════════════════
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import sys, os

# Make sure parent directory (backend root) is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.coding_agent  import coding_agent
from agents.session_manager import session_manager

router = APIRouter(prefix="/api/sandbox", tags=["Coding Sandbox"])


# ── Request models ─────────────────────────────────────────────────

class StartSessionRequest(BaseModel):
    scenario_id: str
    user_id:     str = "anonymous"


class SubmitAnswerRequest(BaseModel):
    session_id:  str
    command:     str
    node_id:     str
    scenario_id: str


class HintRequest(BaseModel):
    session_id:  str
    node_id:     str
    scenario_id: str


# ── Routes ─────────────────────────────────────────────────────────

@router.post("/start")
async def start_session(req: StartSessionRequest):
    """
    Start an adaptive coding session for a scenario.
    
    Returns the first question, scenario context, and session ID.
    """
    result = coding_agent.start_session(req.scenario_id, req.user_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/submit")
async def submit_answer(req: SubmitAnswerRequest):
    """
    Submit a command/action for evaluation.
    
    Returns:
    - verdict (correct/wrong/critical/neutral/prereq)
    - terminal_output (canned or generated)
    - agent_reaction (personality-driven)
    - next_question (next adaptive question)
    - score delta
    - win/lose status
    """
    if not req.command.strip():
        raise HTTPException(status_code=400, detail="Command cannot be empty.")

    result = coding_agent.submit_answer(
        session_id  = req.session_id,
        command     = req.command.strip(),
        node_id     = req.node_id,
        scenario_id = req.scenario_id,
    )
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.post("/hint")
async def get_hint(req: HintRequest):
    """Request a hint for the current question. May use 1 LLM call."""
    result = coding_agent.get_hint(req.session_id, req.node_id, req.scenario_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.get("/status/{session_id}")
async def get_status(session_id: str):
    """Get current session performance metrics."""
    result = coding_agent.get_session_status(session_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result


@router.delete("/session/{session_id}")
async def end_session(session_id: str):
    """Explicitly end/abandon a session."""
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    summary = session.performance_summary()
    session_manager.delete_session(session_id)
    return {"message": "Session ended.", "summary": summary}


@router.get("/scenarios")
async def list_scenarios():
    """List all available scenario IDs grouped by domain."""
    backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scenarios_dir = os.path.join(backend_root, "scenarios")
    result = {}

    for domain in ["swe", "cybersecurity", "pr"]:
        domain_path = os.path.join(scenarios_dir, domain)
        if os.path.exists(domain_path):
            files = [f.replace(".json", "") for f in os.listdir(domain_path) if f.endswith(".json")]
            result[domain] = files

    return {"scenarios": result}


# ════════════════════════════════════════════════════════════════════
# FLASK VERSION (uncomment if your main.py uses Flask)
# ════════════════════════════════════════════════════════════════════
"""
from flask import Blueprint, request, jsonify

sandbox_bp = Blueprint("sandbox", __name__, url_prefix="/api/sandbox")

@sandbox_bp.route("/start", methods=["POST"])
def start_session():
    data   = request.get_json()
    result = coding_agent.start_session(data["scenario_id"], data.get("user_id","anonymous"))
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)

@sandbox_bp.route("/submit", methods=["POST"])
def submit_answer():
    data   = request.get_json()
    result = coding_agent.submit_answer(
        session_id  = data["session_id"],
        command     = data["command"].strip(),
        node_id     = data["node_id"],
        scenario_id = data["scenario_id"],
    )
    if "error" in result:
        return jsonify(result), 404
    return jsonify(result)

@sandbox_bp.route("/hint", methods=["POST"])
def get_hint():
    data   = request.get_json()
    result = coding_agent.get_hint(data["session_id"], data["node_id"], data["scenario_id"])
    return jsonify(result)

@sandbox_bp.route("/status/<session_id>", methods=["GET"])
def get_status(session_id):
    return jsonify(coding_agent.get_session_status(session_id))

@sandbox_bp.route("/session/<session_id>", methods=["DELETE"])
def end_session(session_id):
    session = session_manager.get_session(session_id)
    if not session:
        return jsonify({"error": "Not found"}), 404
    summary = session.performance_summary()
    session_manager.delete_session(session_id)
    return jsonify({"message": "Session ended.", "summary": summary})

@sandbox_bp.route("/scenarios", methods=["GET"])
def list_scenarios():
    backend_root  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    scenarios_dir = os.path.join(backend_root, "scenarios")
    result = {}
    for domain in ["swe", "cybersecurity", "pr"]:
        domain_path = os.path.join(scenarios_dir, domain)
        if os.path.exists(domain_path):
            result[domain] = [f.replace(".json","") for f in os.listdir(domain_path) if f.endswith(".json")]
    return jsonify({"scenarios": result})
"""
