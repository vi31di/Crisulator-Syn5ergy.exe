"""
routes/scenario.py — Scenario data endpoints.
"""

from fastapi import APIRouter, HTTPException
import json, os

router = APIRouter(prefix="/api/scenarios", tags=["Scenarios"])

BACKEND_ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCENARIOS_DIR  = os.path.join(BACKEND_ROOT, "scenarios")
DOMAIN_MAP     = {"swe": "swe", "cybersecurity": "cybersecurity", "pr": "pr"}


def _load(scenario_id: str) -> dict:
    for domain in DOMAIN_MAP:
        path = os.path.join(SCENARIOS_DIR, domain, f"{scenario_id}.json")
        if os.path.exists(path):
            with open(path) as f:
                return json.load(f)
    raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found.")


@router.get("/")
def list_scenarios():
    """List all scenarios grouped by domain."""
    result = {}
    for domain in DOMAIN_MAP:
        d = os.path.join(SCENARIOS_DIR, domain)
        if os.path.exists(d):
            result[domain] = [
                f.replace(".json", "")
                for f in os.listdir(d) if f.endswith(".json")
            ]
    return {"scenarios": result}


@router.get("/{scenario_id}")
def get_scenario(scenario_id: str):
    """Get full scenario data by ID."""
    return _load(scenario_id)


@router.get("/{scenario_id}/brief")
def get_scenario_brief(scenario_id: str):
    """Get lightweight scenario info for the lobby/selection screen."""
    s = _load(scenario_id)
    return {
        "id":          s.get("id"),
        "title":       s.get("title"),
        "severity":    s.get("severity"),
        "brief":       s.get("brief"),
        "objectives":  s.get("objectives", []),
        "agents":      s.get("agents", []),
        "role":        s.get("role", "swe"),
    }
