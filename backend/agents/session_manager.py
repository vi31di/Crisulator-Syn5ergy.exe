"""
session_manager.py — Per-user session state. Tracks room_id for variant seeding.
"""

from __future__ import annotations
import time, uuid
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class AgentSession:
    session_id:        str
    scenario_id:       str
    user_id:           str
    room_id:           str        # ← key for non-repetitive variant seeding
    started_at:        float = field(default_factory=time.time)

    current_node_id:   str   = ""
    score:             int   = 100
    wrong_count:       int   = 0
    correct_count:     int   = 0
    total_questions:   int   = 0

    completed_actions: list[str]  = field(default_factory=list)
    action_history:    list[dict] = field(default_factory=list)
    nodes_seen:        list[str]  = field(default_factory=list)   # for variant tracking

    current_phase:     str        = "detection"
    phases_completed:  list[str]  = field(default_factory=list)

    is_complete:       bool  = False
    outcome:           str   = ""

    # LLM budget — max calls to paid APIs per session
    llm_calls_used:    int   = 0
    llm_calls_max:     int   = 10

    # Rich Action Impact Engine metrics
    blast_radius:      int   = 50  # starting blast footprint (50%)
    recovery_delay:    int   = 0   # cumulative minutes delayed
    confidence_rating: int   = 100 # starting confidence rating (100%)

    # The 6 Scoring Categories (starting values dynamically overridden in post_init)
    category_technical_accuracy:     int = 25
    category_investigation_quality:   int = 20
    category_recovery_effectiveness: int = 20
    category_risk_management:        int = 15
    category_communication_quality:   int = 10
    category_sla_protection:         int = 10

    def __post_init__(self) -> None:
        import json, os
        domain = "swe"
        initial_logs = []
        
        # Load the scenario file to extract the role and initial logs
        backend_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for dom in ["swe", "cybersecurity", "pr"]:
            path = os.path.join(backend_root, "scenarios", dom, f"{self.scenario_id}.json")
            if os.path.exists(path):
                try:
                    with open(path) as f:
                        data = json.load(f)
                        domain = dom
                        initial_logs = data.get("initialLogs", data.get("initial_logs", []))
                except Exception:
                    pass
                break
        
        self.domain = domain
        
        # Define capacities based on domains (each set sums exactly to 100)
        if domain == "pr":
            self.max_tech  = 10
            self.max_inv   = 20
            self.max_rec   = 10
            self.max_risk  = 25
            self.max_comm  = 25
            self.max_sla   = 10
        elif domain == "cybersecurity" or domain == "cyber":
            self.max_tech  = 20
            self.max_inv   = 25
            self.max_rec   = 15
            self.max_risk  = 30
            self.max_comm  = 5
            self.max_sla   = 5
        else: # swe / oncall
            self.max_tech  = 30
            self.max_inv   = 15
            self.max_rec   = 25
            self.max_risk  = 10
            self.max_comm  = 0
            self.max_sla   = 20
            
        # Standardize starting category values to 0 to start from 0 and scale up
        self.category_technical_accuracy     = 0
        self.category_investigation_quality   = 0
        self.category_recovery_effectiveness = 0
        self.category_risk_management        = 0
        self.category_communication_quality   = 0
        self.category_sla_protection         = 0
        self.score = 0
        
        # Initialize continuous logs
        t_str = time.strftime("%H:%M:%S", time.localtime(self.started_at))
        self.logs = [f"[{t_str}] SYSTEM: War Room Initialized"]
        for log in initial_logs:
            self.logs.append(f"[{t_str}] {log}")
            
        self.last_log_ticks = 0

    def append_live_logs(self) -> None:
        """Appends new dynamic logs to self.logs periodically based on elapsed time."""
        import random
        elapsed = time.time() - self.started_at
        
        # Calculate how many log ticks should have occurred (1 log every 1.5 seconds of game time)
        expected_ticks = int(elapsed // 1.5)
        new_ticks = expected_ticks - self.last_log_ticks
        
        if new_ticks <= 0:
            return
            
        self.last_log_ticks = expected_ticks
        new_ticks = min(new_ticks, 10) # Prevent a massive flood of lines on first tick
        
        # Role-specific logs templates
        cyber_logs = [
            'auth: suspicious login from unknown ASN',
            'firewall: outbound traffic spike detected',
            'audit: privilege escalation attempt flagged',
            'ids: reverse shell signature matched',
            'siem: multiple failed MFA challenges'
        ]
        
        if self.scenario_id == 'uber_mfa_attack':
            cyber_logs.append('powershell: payload injected to AD domain controller via remote script (JHN5cyA9IE5ldy1PYmplY3QgU3lzdGVtLk5ldC5XZWJDbGllbnQ7ICRzeXMuRG93bmxvYWRGaWxlKCdodHRwOi8vMTg1LjE0My4yMjMuNDEvcGF5bG9hZC5leGUnLCAnJGVudjpURU1QL3N5cy5leGUnKTsgU3RhcnQtUHJvY2VzcygnJGVudjpURU1QL3N5cy5leGUnKSAtV2luZG93U3R5bGUgSGlkZGVuOw==)')
        elif self.scenario_id == 'colonial_pipeline_ransomware':
            cyber_logs.append('malware: ransomware payload darkside_backdoor.exe compiled: JGMgPSBOZXctT2JqZWN0IFN5c3RlbS5OZXQuU29ja2V0cy5UQ1BDbGllbnQoJzkzLjE4NC4yMTYuMzQnLDQ0NDQpOyAkcyA9ICRjLkdldFN0cmVhbSgpOyB3aGlsZSgkYy5Db25uZWN0ZWQpIHsgLyogRGFya1NpZGUgUmFuc29td2FyZSBCYWNrZG9vciAqLyB9')
        elif self.scenario_id == 'solarwinds_supply_chain':
            cyber_logs.append('network: Sunburst compiler backdoor payload active: IyBTdW5idXJzdCBCYWNrZG9vciBDb21waWxlciBJbmplY3Rvcg0KZnVuY3Rpb24gSW5qZWN0LUJhY2tkb29yIHsNCiAgaWYgKFRlc3QtUGF0aCAiLlxzb3VyY2VcY29yZS5jcyIpIHsNCiAgICBBZGQtQ29udGVudCAiLlxzb3VyY2VcY29yZS5jcyIgIlxuLy8gU3VuYnVyc3QgQmFja2Rvb3JcbnB1YmxpYyBzdGF0aWMgdm9pZCBFeGZpbHRyYXRlKCkgeyBHZXQtQUQtVmF1bHQtVG9rZW5zKCk7IH0iDQogIH0NCn0=')
        elif self.scenario_id == 'target_retail_breach':
            cyber_logs.append('pos: memory scrapers active on register memory: IyBQT1MgVHJhY2stMiBDcmVkaXQgQ2FyZCBNZW1vcnkgU2NyYXBlcg0KJHByb2Nlc3NlcyA9IEdldC1Qcm9jZXNzOw0KZm9yZWFjaCAoJHAgaW4gJHByb2Nlc3Nlcykgew0KICBpZiAoJHAuTmFtZSAtbGlrZSAiKnBvcyoiKSB7DQogICAgW1N5c3RlbS5JTy5GaWxlXTo6V3JpdGVBbGxUZXh0KCIkZW52OlRFTVAvY2FyZHMudHh0IiwgIlNjcmFwZWQ6IDQxMTEtWFhYWC1YWFhYLTExMTE7IEVYUDogMTIvMjg7IENWVjogOTk5Iik7DQogIH0NCn0=')
        elif self.scenario_id == 'equifax_breach':
            cyber_logs.append('httpd: Apache Struts exploit CVE-2017-5638 injected: IyBBcGFjaGUgU3RydXRzIFJlbW90ZSBTaGVsbCBFeHBsb2l0IChDVkUtMjAxNy01NjM4KQ0Kd2hvYW1pOw0KY2F0IC9ldGMvcGFzc3dkOw0KcGdfZHVtcCAtVSByb290IGNvbnN1bWVyX2NyZWRpdF9kYXRhYmFzZSA+IC90bXAvY3JlZGl0X2R1bXAuc3FsOw0KY3VybCAtWCBQT1NUIC1GICJkYXRhPUBsdG1wL2NyZWRpdF9kdW1wLnNxbCIgaHR0cDovLzE5OC41MS4xMDAuNzIvdXBsb2FkOw==')
        else:
            cyber_logs.extend([
                'vpn: DarkSide legacy VPN account connection',
                'ot_network: anomalous SCADA/PLC read operations',
                'system: cryptor module started encrypting volume',
                'exfil: bulk raw text file transfer via FTP',
                'audit: credential theft tools executed in memory'
            ])

        role_templates = {
            "swe": [
                'kube: readiness probe failed pod=payments-api',
                'edge-gw: elevated 5xx rate detected',
                'redis: memory pressure exceeding threshold',
                'db: replication lag increasing',
                'slo: error budget burn rate critical',
                'db: lock contention on orders table index',
                'payments-api: upstream socket timed out at gateway',
                'ingress: active client retries spiking',
                'pg_stat: transaction queue length exceeded 500 connections',
                'kube: HPA scaling replica set saturation',
                'gateway: retry-after header ignored by legacy clients'
            ],
            "cybersecurity": cyber_logs,
            "pr": [
                'social: negative sentiment spike detected',
                'media: journalist requesting comment',
                'support: customer complaint volume rising',
                'brandwatch: outage hashtag trending',
                'exec: board requesting public statement',
                'press: Reuters publishing draft: "MCAS flaw suspected"',
                'social: hashtag #737MaxGrounding trending globally',
                'faa: regulatory notice of inquiry into certification',
                'crisis: internal memo leak: engineers flagged sensor issues',
                'support: cancellation queue spikes for tickets'
            ]
        }
        
        templates = role_templates.get(self.domain, role_templates["swe"])
        
        for _ in range(new_ticks):
            timestamp = time.strftime("%H:%M:%S", time.localtime())
            msg = random.choice(templates)
            self.logs.append(f"[{timestamp}] {msg}")
            
        # Cap log list size to prevent memory leak
        if len(self.logs) > 300:
            self.logs = [self.logs[0]] + self.logs[-299:]

    def _apply_category_impacts(self, command: str, verdict: str, scoreImpact: int) -> None:
        cmd_lower = command.lower()
        
        w_tech = 0.25
        w_inv = 0.20
        w_rec = 0.20
        w_risk = 0.15
        w_comm = 0.10
        w_sla = 0.10
        
        # Adjust weights dynamically based on command intent
        if any(k in cmd_lower for k in ["apologize", "statement", "pr", "comms", "apology", "press"]):
            # Primarily communications
            w_comm = 0.60
            w_tech = 0.08
            w_inv = 0.08
            w_rec = 0.08
            w_risk = 0.08
            w_sla = 0.08
        elif any(k in cmd_lower for k in ["logs", "describe", "diagnose", "grep", "cat", "inspect", "show", "get"]):
            # Diagnostics/Investigation
            w_inv = 0.60
            w_tech = 0.15
            w_rec = 0.05
            w_risk = 0.05
            w_comm = 0.05
            w_sla = 0.10
        elif any(k in cmd_lower for k in ["restart", "reboot", "scale", "rollback", "redeploy", "revert"]):
            # Remediation/Recovery
            w_rec = 0.50
            w_sla = 0.20
            w_risk = 0.15
            w_tech = 0.10
            w_inv = 0.05
            w_comm = 0.00
        elif any(k in cmd_lower for k in ["drop", "delete", "rm", "kill", "shutdown", "terminate"]):
            # High risk action!
            w_risk = 0.60
            w_tech = 0.15
            w_rec = 0.15
            w_sla = 0.10
            w_inv = 0.00
            w_comm = 0.00
            
        # Normalize weights so they sum to 1.0
        total_w = w_tech + w_inv + w_rec + w_risk + w_comm + w_sla
        if total_w > 0:
            w_tech /= total_w
            w_inv /= total_w
            w_rec /= total_w
            w_risk /= total_w
            w_comm /= total_w
            w_sla /= total_w
            
        # Mathematically precise integer distribution of scoreImpact
        cats = [
            ("tech", self.category_technical_accuracy, self.max_tech, w_tech),
            ("inv", self.category_investigation_quality, self.max_inv, w_inv),
            ("rec", self.category_recovery_effectiveness, self.max_rec, w_rec),
            ("risk", self.category_risk_management, self.max_risk, w_risk),
            ("comm", self.category_communication_quality, self.max_comm, w_comm),
            ("sla", self.category_sla_protection, self.max_sla, w_sla)
        ]
        
        # Calculate raw float changes and initial rounded changes
        raw_changes = [scoreImpact * c[3] for c in cats]
        changes = [round(rc) for rc in raw_changes]
        
        # Apply initial clipped changes
        actual_changes = []
        for i, (name, curr, max_val, w) in enumerate(cats):
            target = curr + changes[i]
            clipped = max(-max_val, min(max_val, target))
            actual_changes.append(clipped - curr)
            
        current_sum = sum(actual_changes)
        diff = scoreImpact - current_sum
        
        # Proportional integer distribution of remaining difference
        if diff != 0:
            step = 1 if diff > 0 else -1
            # Sort categories by weight descending so higher weights are prioritized
            indices_by_weight = sorted(range(len(cats)), key=lambda idx: cats[idx][3], reverse=True)
            
            limit_detector = 0
            while diff != 0 and limit_detector < 100:
                limit_detector += 1
                any_change = False
                for idx in indices_by_weight:
                    name, curr, max_val, w = cats[idx]
                    current_change = actual_changes[idx]
                    new_change = current_change + step
                    target = curr + new_change
                    if -max_val <= target <= max_val:
                        actual_changes[idx] = new_change
                        diff -= step
                        any_change = True
                        if diff == 0:
                            break
                if not any_change:
                    break
                    
        # Apply the final mathematically guaranteed integer changes
        self.category_technical_accuracy     = self.category_technical_accuracy     + actual_changes[0]
        self.category_investigation_quality   = self.category_investigation_quality   + actual_changes[1]
        self.category_recovery_effectiveness = self.category_recovery_effectiveness + actual_changes[2]
        self.category_risk_management        = self.category_risk_management        + actual_changes[3]
        self.category_communication_quality   = self.category_communication_quality   + actual_changes[4]
        self.category_sla_protection         = self.category_sla_protection         + actual_changes[5]


    def record_action(
        self,
        command: str,
        verdict: str,
        points: int,
        scoreImpact: int = 0,
        blastRadiusImpact: int = 0,
        recoveryDelay: int = 0,
        confidenceImpact: int = 0,
        feedback: str = ""
    ) -> None:
        self.action_history.append({
            "command":            command,
            "verdict":            verdict,
            "points":             points,
            "scoreImpact":        scoreImpact,
            "blastRadiusImpact":   blastRadiusImpact,
            "recoveryDelay":      recoveryDelay,
            "confidenceImpact":   confidenceImpact,
            "timestamp":          time.time(),
            "phase":              self.current_phase,
            "feedback":           feedback,
        })
        self.completed_actions.append(command)
        
        # Record user action directly in continuous logs
        timestamp = time.strftime("%H:%M:%S", time.localtime())
        self.logs.append(f"[{timestamp}] EVENT: {command.upper()} -> [{verdict.upper()}] {feedback}")
        
        # Update running metrics
        self.blast_radius = max(0, min(100, self.blast_radius + blastRadiusImpact))
        self.recovery_delay = max(0, self.recovery_delay + recoveryDelay)
        self.confidence_rating = max(0, min(100, self.confidence_rating + confidenceImpact))
        
        # Apply dynamic category adjustments
        self._apply_category_impacts(command, verdict, scoreImpact)
        
        # Total score is the sum of the 6 categories!
        self.score = max(-100, min(100, (
            self.category_technical_accuracy +
            self.category_investigation_quality +
            self.category_recovery_effectiveness +
            self.category_risk_management +
            self.category_communication_quality +
            self.category_sla_protection
        )))
        
        self.total_questions += 1
        if verdict in ("correct", "critical"):
            self.correct_count += 1
        elif verdict == "wrong":
            self.wrong_count   += 1

    def modify_score_delta(self, delta: int, reason: str = "spontaneous_event") -> None:
        """Safely apply a score change from an external trigger (like spontaneous events)."""
        self._apply_category_impacts(reason, "wrong" if delta < 0 else "correct", delta)
        self.score = max(-100, min(100, (
            self.category_technical_accuracy +
            self.category_investigation_quality +
            self.category_recovery_effectiveness +
            self.category_risk_management +
            self.category_communication_quality +
            self.category_sla_protection
        )))

    def mark_node_seen(self, node_id: str) -> None:
        if node_id not in self.nodes_seen:
            self.nodes_seen.append(node_id)

    def advance_phase(self, new_phase: str) -> None:
        if self.current_phase not in self.phases_completed:
            self.phases_completed.append(self.current_phase)
        self.current_phase = new_phase

    def can_call_llm(self) -> bool:
        return self.llm_calls_used < self.llm_calls_max

    def use_llm_call(self) -> None:
        self.llm_calls_used += 1

    def elapsed_seconds(self) -> float:
        return time.time() - self.started_at

    def performance_summary(self) -> dict:
        accuracy = (self.correct_count / self.total_questions * 100) if self.total_questions else 0
        return {
            "session_id":       self.session_id,
            "scenario_id":      self.scenario_id,
            "room_id":          self.room_id,
            "score":            self.score,
            "accuracy":         round(accuracy, 1),
            "total_questions":  self.total_questions,
            "correct":          self.correct_count,
            "wrong":            self.wrong_count,
            "phases_completed": self.phases_completed,
            "elapsed_seconds":  round(self.elapsed_seconds()),
            "outcome":          self.outcome,
            "llm_calls_used":   self.llm_calls_used,
            "blast_radius":      self.blast_radius,
            "recovery_delay":    self.recovery_delay,
            "confidence_rating": self.confidence_rating,
            "logs":              self.logs,
            "categories": {
                "technical_accuracy":     self.category_technical_accuracy,
                "investigation_quality":   self.category_investigation_quality,
                "recovery_effectiveness": self.category_recovery_effectiveness,
                "risk_management":        self.category_risk_management,
                "communication_quality":   self.category_communication_quality,
                "sla_protection":         self.category_sla_protection,
            }
        }


class SessionManager:
    def __init__(self):
        self._sessions: dict[str, AgentSession] = {}

    def create_session(
        self,
        scenario_id:   str,
        user_id:       str,
        room_id:       str,
        start_node_id: str,
    ) -> AgentSession:
        session_id = str(uuid.uuid4())
        session = AgentSession(
            session_id      = session_id,
            scenario_id     = scenario_id,
            user_id         = user_id,
            room_id         = room_id,
            current_node_id = start_node_id,
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[AgentSession]:
        return self._sessions.get(session_id)

    def delete_session(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def cleanup_expired(self, max_age_seconds: int = 14400) -> int:
        now  = time.time()
        dead = [sid for sid, s in self._sessions.items()
                if now - s.started_at > max_age_seconds]
        for sid in dead:
            del self._sessions[sid]
        return len(dead)


session_manager = SessionManager()
