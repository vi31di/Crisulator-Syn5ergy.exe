# Syn5ergy API Routing Map & Contract

To prevent architectural drift, this document acts as the single source of truth defining all valid backend API endpoints, their expected input models, and response formats.

## API Specification

| Method | Route | Request Body / Parameters | Response JSON Schema / Example |
| :--- | :--- | :--- | :--- |
| **GET** | `/scenarios/{role}` | `role` (path parameter: `oncall`, `security`, `comms`) | `Array<{ id: str, title: str, severity: str, service: str, description: str }>` |
| **GET** | `/scenarios/{role}/{scenario_id}` | `role` (path), `scenario_id` (path) | Full Scenario Configuration Object (Pydantic-backed dict) |
| **POST** | `/terminal/init-state/{scenario_id}` | `scenario_id` (path) | `{ "status": "State initialized", "key": "session_key" }` |
| **POST** | `/terminal/evaluate` | `TerminalCommandRequest` `{ command: str, scenario_id: str, role: str, current_state: dict }` | `{ "outcome": str, "points": int, "terminal_output": str, "state_changes": dict, "tick_id": int }` |
| **POST** | `/agents/chat` | `AgentChatRequest` `{ agent: str, situation: str, scenario_id: str, user_message: str, history: Array, is_plan: bool }` | `{ "agent": str, "name": str, "tone": str, "message": str }` |
| **GET** | `/simulation/tick/{scenario_id}` | `scenario_id` (path), `role` (optional query parameter) | Full Telemetry Tick State Payload `{ tick_id: int, metrics: dict, spontaneous_events: Array, ui_fatigue_modifiers: dict, ... }` |
| **GET** | `/export_replay/{scenario_id}` | `scenario_id` (path) | Replay Trace Log Payload `{ schema_version: str, scenario_id: str, snapshots: Array, causality_log: Array, ... }` |
| **POST** | `/auth/register` | `RegisterRequest` `{ username: str, password: str, name: str }` | `{ "token": str, "user": { "username": str, "name": str } }` |
| **POST** | `/auth/login` | `LoginRequest` `{ username: str, password: str }` | `{ "token": str, "user": { "username": str, "name": str } }` |
| **POST** | `/auth/logout` | None | `{ "status": "success", "message": str }` |
| **GET** | `/auth/me` | None (inspects auth header) | `{ "username": str, "name": str }` |
| **POST** | `/agents/postmortem` | `PostmortemRequest` `{ scenario_id: str, actions: List[str], timeline: List[str] }` | `{ "postmortem": "markdown retrospective document text" }` |
| **POST** | `/leaderboard/submit` | `ScoreSubmitRequest` `{ scenario_id: str, role: str, score: int, time_taken: int, username: str }` | `{ "status": "success", "entry": { scenario_id, role, score, time_taken, username, timestamp } }` |
| **GET** | `/leaderboard` | None | Sorted list of submitted scores: `Array<{ scenario_id, role, score, time_taken, username, timestamp }>` |
| **POST** | `/agents/broadcast` | `BroadcastRequest` `{ logs: List[str], scenario_id: str }` | `{ "manager": { message }, "teammate": { message }, "client": { message }, "lead": { message } }` |
| **POST** | `/agents/summarize-alerts` | `SummarizeAlertsRequest` `{ logs: List[str] }` | `{ "summary": "bulleted markdown list of key anomalies" }` |
