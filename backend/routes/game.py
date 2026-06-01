"""
routes/game.py — WebSocket game room + HTTP room management.
Integrates with MultiplayerManager from services/multiplayer_manager.py.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from pydantic import BaseModel
import sys, os, json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from services.multiplayer_manager import manager

router = APIRouter(prefix="/api/game", tags=["Game"])


# ── HTTP endpoints ─────────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    scenario_id: str
    host_user_id: str


@router.post("/room")
async def create_room(req: CreateRoomRequest):
    """Create a new game room for a scenario."""
    import uuid
    room_id = str(uuid.uuid4())[:8].upper()

    # Pre-seed room state
    manager.room_states[room_id] = {
        "scenario_id": req.scenario_id,
        "host":        req.host_user_id,
        "players":     [req.host_user_id],
        "logs":        [],
        "phase":       "lobby",
        "started":     False,
    }
    return {"room_id": room_id, "scenario_id": req.scenario_id}


@router.get("/room/{room_id}")
def get_room(room_id: str):
    """Get current room state."""
    state = manager.room_states.get(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="Room not found.")
    connections = len(manager.active_connections.get(room_id, []))
    return {**state, "active_connections": connections}


@router.get("/room/{room_id}/players")
def get_room_players(room_id: str):
    state = manager.room_states.get(room_id)
    if not state:
        raise HTTPException(status_code=404, detail="Room not found.")
    return {"players": state.get("players", []),
            "active":  len(manager.active_connections.get(room_id, []))}


# ── WebSocket ──────────────────────────────────────────────────────────────────

@router.websocket("/ws/{room_id}/{user_id}")
async def game_websocket(websocket: WebSocket, room_id: str, user_id: str):
    """
    WebSocket endpoint for real-time game events.
    
    Message types sent TO client:
      {type: "player_joined",   user_id, players}
      {type: "player_left",     user_id, players}
      {type: "log_update",      log_entry}
      {type: "phase_change",    phase, metrics}
      {type: "agent_message",   agent, role, message}
      {type: "game_started",    scenario_id}
      {type: "game_ended",      outcome, summary}

    Message types received FROM client:
      {type: "start_game"}
      {type: "add_log",         entry}
      {type: "update_metrics",  metrics}
      {type: "send_message",    message}
    """
    await manager.connect(websocket, room_id)

    # Track player in room state
    state = manager.room_states.setdefault(room_id, {
        "scenario_id": None, "players": [], "logs": [], "phase": "lobby", "started": False
    })
    if user_id not in state["players"]:
        state["players"].append(user_id)

    # Announce join
    await manager.broadcast(
        {"type": "player_joined", "user_id": user_id, "players": state["players"]},
        room_id
    )

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            if msg_type == "start_game":
                state["started"] = True
                state["phase"]   = "detection"
                await manager.broadcast(
                    {"type": "game_started", "scenario_id": state.get("scenario_id")},
                    room_id
                )

            elif msg_type == "add_log":
                entry = msg.get("entry", "")
                state["logs"].append(entry)
                await manager.broadcast(
                    {"type": "log_update", "log_entry": entry},
                    room_id
                )

            elif msg_type == "update_metrics":
                await manager.broadcast(
                    {"type": "metrics_update", "metrics": msg.get("metrics", {})},
                    room_id
                )

            elif msg_type == "phase_change":
                state["phase"] = msg.get("phase", state["phase"])
                await manager.broadcast(
                    {"type": "phase_change", "phase": state["phase"]},
                    room_id
                )

            elif msg_type == "send_message":
                await manager.broadcast(
                    {"type": "chat_message", "user_id": user_id,
                     "message": msg.get("message", "")},
                    room_id
                )

            elif msg_type == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        if user_id in state["players"]:
            state["players"].remove(user_id)
        await manager.broadcast(
            {"type": "player_left", "user_id": user_id, "players": state["players"]},
            room_id
        )
