import json
from typing import Dict, List
from fastapi import WebSocket

class MultiplayerManager:
    def __init__(self):
        # Maps room_id to a list of active websocket connections
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Maps room_id to current scenario state
        self.room_states: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
            self.room_states[room_id] = {
                "logs": [],
                "scenario_id": None,
                "players": []
            }
        self.active_connections[room_id].append(websocket)

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                # Optionally clean up empty rooms, but maybe keep state for a while
                pass

    async def broadcast(self, message: dict, room_id: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(json.dumps(message))

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

manager = MultiplayerManager()
