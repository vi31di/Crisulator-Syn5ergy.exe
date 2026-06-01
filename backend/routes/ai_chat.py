"""
routes/ai_chat.py — AI chat endpoints for the Chat tab.
Handles agent personality conversations using the LLM router.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agents.llm_router import llm_router
from agents.coding_agent import load_scenario

router = APIRouter(prefix="/api/chat", tags=["AI Chat"])


class ChatRequest(BaseModel):
    scenario_id: str
    agent_name:  str          # "Manager" or "Teammate"
    user_message: str
    context:     str = ""     # recent action history or phase info


class ChatResponse(BaseModel):
    agent:   str
    role:    str
    message: str
    source:  str              # "llm" | "fallback"


@router.post("/message", response_model=ChatResponse)
def chat_with_agent(req: ChatRequest):
    """
    Send a message to a scenario agent (Manager or Teammate).
    Used by the Chat tab for in-character conversations.
    """
    scenario = load_scenario(req.scenario_id)
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found.")

    # Find the requested agent
    agents = scenario.get("agents", [])
    agent  = next((a for a in agents if a["name"].lower() in req.agent_name.lower() or req.agent_name.lower() in a["name"].lower()), None)
    if not agent:
        role_mapping = {
            "cto": {"name": "CTO", "role": "Chief Technology Officer", "focus": "downstream business impact and SLA breaches", "style": "strategic and high-pressure"},
            "manager": {"name": "Incident Manager", "role": "Incident Manager", "focus": "timeline, playbooks, and communications routing", "style": "operations-focused and direct"},
            "team lead": {"name": "Team Lead", "role": "SRE Lead", "focus": "system metrics, container restarts, and load limits", "style": "technical and supportive"},
            "lead": {"name": "Team Lead", "role": "SRE Lead", "focus": "system metrics, container restarts, and load limits", "style": "technical and supportive"},
            "sre": {"name": "SRE", "role": "Site Reliability Engineer", "focus": "mitigation playbooks and host performance", "style": "analytical and precise"},
            "devops": {"name": "DevOps Engineer", "role": "Platform Ops", "focus": "Kubernetes pod configurations and container scaling", "style": "infrastructure-focused"},
            "security": {"name": "Security Lead", "role": "Security Operations Lead", "focus": "perimeter firewall containment and intrusion detection", "style": "vigilant and cautious"},
            "analyst": {"name": "Security Analyst", "role": "Security Analyst", "focus": "boundary logs and network intrusion signatures", "style": "detailed and forensic"},
            "dba": {"name": "DBA", "role": "Database Administrator", "focus": "pg pool connection saturation, locks, and query optimization", "style": "database-centric"},
            "database": {"name": "DBA", "role": "Database Administrator", "focus": "pg pool connection saturation, locks, and query optimization", "style": "database-centric"},
            "ai assistant": {"name": "AI Assistant", "role": "Predictive Telemetry AI Agent", "focus": "anomaly identification and telemetry predictions", "style": "socratic and data-driven"},
            "assistant": {"name": "AI Assistant", "role": "Predictive Telemetry AI Agent", "focus": "anomaly identification and telemetry predictions", "style": "socratic and data-driven"},
            "teammate": {"name": "SRE", "role": "Site Reliability Engineer", "focus": "mitigation playbooks and host performance", "style": "analytical and precise"},
            "client": {"name": "Product Manager", "role": "Product Manager", "focus": "customer satisfaction and SLA metrics", "style": "customer-focused"}
        }
        req_name_lower = req.agent_name.lower()
        matched = None
        for key, val in role_mapping.items():
            if key in req_name_lower:
                matched = val
                break
        if matched:
            agent = matched
        else:
            agent = {"name": req.agent_name, "role": "SRE", "focus": "resolving the incident", "style": "professional"}

    personalities = scenario.get("stakeholder_personalities", {})
    persona       = personalities.get(agent["name"], {})
    style  = persona.get("style", "professional") if isinstance(persona, dict) else str(persona)
    focus  = persona.get("focus", "resolving the incident") if isinstance(persona, dict) else ""

    system_prompt = (
        f"You are {agent['name']}, the {agent['role']}.\n"
        f"Communication style: {style}. Your focus: {focus}.\n"
        f"Scenario: {scenario.get('title')} — {scenario.get('brief', '')}\n"
        f"Stay in character. Be concise (2-3 sentences). "
        f"You are under pressure. Severity: {scenario.get('severity', 'SEV1')}.\n"
        f"Context: {req.context}" if req.context else ""
    )

    response = llm_router.generate_sync(system_prompt, req.user_message, max_tokens=120)

    if response:
        return ChatResponse(
            agent   = agent["name"],
            role    = agent["role"],
            message = response,
            source  = "llm",
        )

    # Fallback — pull canned message from scenario JSON
    canned = agent.get("message", f"{agent['name']}: I'm focused on resolving this incident.")
    return ChatResponse(
        agent   = agent["name"],
        role    = agent["role"],
        message = canned,
        source  = "fallback",
    )


@router.get("/providers")
def get_provider_status():
    """Show current LLM provider rate limit status. Useful for debugging."""
    return {"providers": llm_router.provider_status()}
