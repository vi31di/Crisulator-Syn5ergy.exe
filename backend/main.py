from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional
import textwrap

# 1. Load environment variables from .env file immediately on server boot
load_dotenv()

# Route imports
from routes import scenario, game, ai_chat, coding_sandbox
from agents.postmortem_agent import postmortem_agent
from agents.session_manager import session_manager
from agents.coding_agent import load_scenario

app = FastAPI(title="Syn5ergy Backend", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scenario.router)
app.include_router(game.router)
app.include_router(ai_chat.router)
app.include_router(coding_sandbox.router)


# 2. Register `/agents/postmortem` endpoint to serve the AI Postmortem Agent
class PostmortemRequest(BaseModel):
    scenario_id: str
    actions: List[str]
    timeline: List[str]
    score: int
    role: str

def rating_for_ratio(ratio: float) -> str:
    if ratio >= 0.8:
        return "Strong"
    elif ratio >= 0.5:
        return "Moderate"
    else:
        return "Weak"

def get_overall_verdict(score: int) -> str:
    if score >= 80:
        return "Excellent"
    elif score >= 60:
        return "Good"
    elif score >= 40:
        return "Needs Improvement"
    else:
        return "Critical Gaps Identified"

def get_operational_assessment(entry: dict) -> str:
    verdict = entry.get("verdict", "")
    cmd = entry.get("command", "").lower()
    delay = entry.get("recoveryDelay", 0)
    
    if delay > 0:
        return "Delayed"
        
    if verdict in ("correct", "critical"):
        if any(k in cmd for k in ["logs", "describe", "get", "cat", "grep", "show", "list", "check", "verify", "status", "info", "view"]):
            return "Observational"
        return "Recommended"
    elif verdict in ("wrong", "prereq"):
        return "Risky"
    else:
        return "Observational"

def build_decision_analysis(session) -> str:
    history = session.action_history
    if not history:
        return "*No technical terminal commands were executed.*"
        
    blocks = []
    major_actions = []
    seen_verbs = set()
    
    for entry in history:
        cmd = entry.get("command", "")
        verdict = entry.get("verdict", "")
        
        verb = "other"
        if "get" in cmd.lower() or "pods" in cmd.lower():
            verb = "get_pods"
        elif "logs" in cmd.lower() or "describe" in cmd.lower():
            verb = "logs"
        elif "restart" in cmd.lower() or "reboot" in cmd.lower():
            verb = "restart"
        elif "scale" in cmd.lower():
            verb = "scale"
        elif "apologize" in cmd.lower() or "statement" in cmd.lower() or "status" in cmd.lower():
            verb = "comms"
            
        if verb != "other" and verb not in seen_verbs:
            major_actions.append((entry, verb))
            seen_verbs.add(verb)
            
    if not major_actions:
        for entry in history[:2]:
            major_actions.append((entry, "generic"))
            
    for entry, verb in major_actions[:4]:
        cmd = entry.get("command", "")
        verdict = entry.get("verdict", "")
        is_correct = verdict in ("correct", "critical")
        
        action_name = cmd
        assessment = "Recommended"
        reason = "Performed action that supported root-cause investigation."
        impact = "Improved situational awareness."
        
        if verb == "get_pods":
            action_name = "kubectl get pods"
            assessment = "Recommended"
            reason = "Provided visibility into cluster health and service availability."
            impact = "Improved situational awareness."
        elif verb == "logs":
            action_name = "Inspect Component Logs"
            assessment = "Recommended"
            reason = "Examined application log buffers to gather diagnostic context and trace error indicators."
            impact = "Enabled rapid isolation of resource pool boundaries."
        elif verb == "restart":
            action_name = "Restart Database"
            if is_correct:
                assessment = "Recommended"
                reason = "Safely cleared saturated pool locks and released stale transaction buffers."
                impact = "Recovered database capacity margins."
            else:
                assessment = "Premature"
                reason = "The underlying issue had not yet been confirmed. Restarting services risked masking valuable diagnostic information."
                impact = "Increased investigation complexity."
        elif verb == "scale":
            action_name = "Scale Services"
            if is_correct:
                assessment = "Recommended"
                reason = "Dynamically provisioned additional replica capacity to absorb query amplification spikes."
                impact = "Slashed request latency queues."
            else:
                assessment = "Risky"
                reason = "Scaling before confirming capacity constraints could lead to unnecessary resource allocation."
                impact = "Low operational value."
        elif verb == "comms":
            action_name = "Update Stakeholder Communications"
            if is_correct:
                assessment = "Recommended"
                reason = "Proactively informed management and clients about mitigation status, aligned expectations."
                impact = "Stabilized stakeholder public confidence."
            else:
                assessment = "Risky"
                reason = "Dispatched inaccurate ETAs or exposed details prematurely without verifying state recovery."
                impact = "Severely degraded public reputation."
        else:
            if is_correct:
                assessment = "Recommended"
                reason = f"Executed standard recovery step for '{cmd}' within playbook recommendations."
                impact = "Supported direct containment of incident blast radius."
            else:
                assessment = "Risky"
                reason = f"Executed '{cmd}' without sufficient diagnostic evidence or prerequisite validation."
                impact = "Increased overall operational latency."
                
        blocks.append(f"""Action:
{action_name}

Assessment:
{assessment}

Reason:
{reason}

Impact:
{impact}""")
        
    return "\n\n--------------------------------\n\n".join(blocks)

@app.post("/agents/postmortem")
async def generate_postmortem(req: PostmortemRequest):
    # Retrieve scenario configuration
    scenario_data = load_scenario(req.scenario_id)
    if not scenario_data:
        return {"postmortem": "Scenario configuration not found."}

    # Find the most recently completed session matching this scenario
    active_sessions = list(session_manager._sessions.values())
    session = next((s for s in active_sessions if s.scenario_id == req.scenario_id), None)

    if session:
        # Generate the structured AI postmortem dictionary
        report_data = postmortem_agent.generate(scenario_data, session)
        raw_report = report_data.get("postmortem", {})
        
        # Build chronological timeline table without points
        timeline_rows = []
        for index, t in enumerate(raw_report.get("timeline", [])):
            entry = session.action_history[index] if index < len(session.action_history) else {}
            assessment = get_operational_assessment(entry)
            cmd = entry.get("command", "")
            feedback = entry.get("feedback", "")
            if not feedback:
                if "scale" in cmd.lower():
                    feedback = "No improvement observed."
                elif "restart" in cmd.lower() or "reboot" in cmd.lower() or "rollback" in cmd.lower():
                    feedback = "Temporary recovery detected." if entry.get("verdict") in ("correct", "critical") else "No improvement observed."
                elif "get" in cmd.lower() or "describe" in cmd.lower() or "logs" in cmd.lower():
                    feedback = "Operational diagnostic context gathered successfully."
                else:
                    feedback = "Command executed successfully. Monitoring telemetry stabilization metrics."
            feedback = str(feedback).replace("|", "\\|").replace("\n", " ")
            timeline_rows.append(
                f"| {t.get('timestamp', '--')} | `{cmd}` | {feedback} | {assessment} |"
            )
        timeline_table = "\n".join(timeline_rows)

        # Get actions and timeline from backend data
        actions = [e["command"] for e in session.action_history]
        final_score = session.score
        if session.outcome == "lose":
            # Cap score to 35 to guarantee a "Critical Gaps Identified" verdict for unresolved incidents
            final_score = min(35, final_score)
        current_role = req.role or 'oncall'
        
        # Scenario metadata mapping (matching frontend's expectations)
        scenario_id = req.scenario_id
        title = scenario_data.get('title', 'US-EAST-1 S3 Outage Cascades')
        service = scenario_data.get('service', 'production-microservice')
        severity = scenario_data.get('severity', 'SEV1')
        desc = scenario_data.get('description', scenario_data.get('brief', 'A critical resource or configuration constraint triggered downstream operational failures.'))
        
        if scenario_id == "aws_s3_outage":
            s_desc = "A high-frequency administrative command error removed core storage subsystem routing entries, breaking downstream applications."
            root_cause_default = "Recursive retry storms on the s3-connector service saturated postgres connection pools, causing connection starvation and backend service CrashLoopBackOffs."
            optimal_path = "Verify connector connection status with 'kubectl logs s3-connector', scale connector replicas or implement circuit-breaker middleware to isolate upstream latency, flush pg pool, and verify metrics."
        elif scenario_id == "cloudflare_global_outage":
            s_desc = "Global DNS queries timed out at edge nodes, causing load balancers to route 100% of client traffic to backup origins."
            root_cause_default = "Edge CDN routing failure diverted raw unthrottled search traffic straight to single-node backup ingress servers, inducing CPU saturation and thread-pool lockup."
            optimal_path = "Assess edge propagation status, apply rate-limiting rules at load balancer levels to throttle incoming surges, and scale edge ingress pool replicas."
        elif scenario_id == "retry_storm":
            s_desc = "A minor network latency flap induced aggressive client retry loops without exponential backoff policies, saturating backend pools."
            root_cause_default = "High-frequency un-throttled query amplification saturated postgres DB connections pool, starving the user authorization service."
            optimal_path = "Assess DB pool saturation thresholds, deploy aggressive ingress API throttling, activate circuit-breaker policies, and verify downstream pool recovery."
        else:
            s_desc = desc
            root_cause_default = scenario_data.get("root_cause", "Systemic latency amplification and thread-pool exhaustion under peak connection stress.")
            mit_path = scenario_data.get("mitigation_path", [])
            optimal_path = f"Follow the playbook mitigation sequence: {', '.join(mit_path) if mit_path else 'Investigate logs, check connection thresholds, and scale replicas.'}."

        # Compute operator profile and archetype exactly like frontend ScoreScreen.jsx
        operational_status = "STABILIZED & RECOVERED" if final_score >= 50 else "SEVERE SYSTEM DEGRADATION / CRITICAL DOWN"
        
        archetype = "Standard SRE Operational Recovery"
        archetype_details = "Stabilized the cluster within reasonable SLA windows, preserving core database boundaries and client traffic."
        tone_emoji = "🟢 [STANDARD MITIGATION]"
        
        if len(actions) == 0:
            archetype = "Inactivity / Silent Watcher"
            archetype_details = "The operator failed to begin active investigation procedures before the incident escalated. The operational team failed to establish a diagnostic foothold."
            tone_emoji = "🔴 [INACTIVITY FAILURE]"
        elif final_score < 50 and len(actions) > 5:
            archetype = "Reckless Operator"
            archetype_details = "Executed a high frequency of state-mutating commands and system modifications without verifying diagnostic prerequisites, resulting in cascading error propagation."
            tone_emoji = "🔴 [RECKLESS OPERATION]"
        elif any(actions.count(val) > 1 for val in actions):
            archetype = "Tunnel Vision / Investigative Loop"
            archetype_details = "Repeated duplicate diagnostic scripts or log extractions, failing to expand investigative scope or execute mitigating commands."
            tone_emoji = "🟡 [TUNNEL VISION]"
        elif final_score < 50 and any("restart" in a or "reboot" in a or "rollback" in a or "scale" in a for a in actions):
            archetype = "Panic Rollback / Premature Restart"
            archetype_details = "Triggered speculative reboots or configuration rollbacks on critical components while upstream db pools were saturated, magnifying retry loops and connection starvation."
            tone_emoji = "🔴 [PANIC REACTION]"
        elif final_score < 50 and (current_role in ('pr', 'comms')):
            archetype = "Public Relations & Communication Collapse"
            archetype_details = "Exposed severe company liability, provided contradictory ETAs to executive leaders, or failed to establish stakeholder transparency under pressure."
            tone_emoji = "🔴 [COMMUNICATIONS FAILURE]"
        elif final_score >= 80:
            archetype = "Elite SRE / Proactive Triage"
            archetype_details = "Demonstrated stellar cognitive control, minimal command footprint, rapid diagnostic isolation, and optimal deployment of mitigation playbooks."
            tone_emoji = "🟢 [ELITE SRE SUCCESS]"

        # Build causality logs without command indexes
        causality_rows = []
        if len(actions) == 0:
            causality_section = "* **Causal Link**: Zero terminal commands dispatched. By executing no investigative or restorative scripts, the root cause was left fully unchecked, allowing a minor microservice latency spike to escalate into a total gateway block."
        else:
            for index, act in enumerate(actions):
                link = "Provided general telemetry diagnostics."
                if "logs" in act or "describe" in act:
                    link = "Inspected container internals, helping isolate root cause configurations."
                elif "restart" in act or "reboot" in act:
                    if final_score < 50:
                        link = "Triggered container reboot under peak load, wiping transaction state and amplifying query connection storms."
                    else:
                        link = "Refreshed service resources, clearing hung memory buffers and helping stabilize request queues."
                elif "scale" in act:
                    link = "Adjusted active replica thresholds, helping absorb traffic volume anomalies."
                causality_rows.append(f"* **Action**: `{act}` -> *Causality Analysis*: {link}")
            causality_section = "\n".join(causality_rows)

        # Discovery clues (Investigation Analysis)
        discoveries = []
        if len(actions) > 0:
            discoveries.append("isolated socket errors to target ingress container")
            if "logs" in "".join(actions):
                discoveries.append("identified db pool saturation anomaly trace")
        
        if discoveries:
            discovery_logs = "\n".join([f"* **Isolated Clue**: Successfully isolated anomaly trace - `{d}`." for d in discoveries])
        else:
            if len(actions) == 0:
                discovery_logs = "* **Diagnostic Failure**: Operator did not engage in investigation. Zero diagnostic traces were mapped."
            else:
                discovery_logs = "* **Missed Clues**: Active console traces showed CrashLoopBackOff and socket errors, but the operator did not isolate these indicators to a specific database pool boundary."

        # Stakeholder Consequences
        if final_score >= 50:
            stakeholder_consequences = (
                "* **Manager Trust**: Maintained at high levels due to professional resolution pace.\n"
                "* **Executive Confidence**: Stable; ETAs matched actual remediation progress.\n"
                "* **Customer Impact**: Minimal; request error rates stabilized before exceeding SLA breach thresholds.\n"
                "* **Public Trust & Legal Liability**: Zero exposure; incident was resolved internally without data loss or breach disclosure requirements."
            )
        else:
            stakeholder_consequences = (
                "* **Manager Trust**: Collapse. No clear status timeline updates were dispatched, causing escalation up the management tier.\n"
                "* **Executive Confidence**: Destroyed. Premature promises or total inaction left leadership without viable path projections.\n"
                "* **Customer Impact**: High. Thousands of premium clients experienced checkout or asset fetching timeouts, generating significant chargebacks.\n"
                "* **Public Trust & Legal Liability**: High exposure. Unmitigated system downtime resulted in SLA breach penalties, with legal counsel flagging liability risks."
            )

        # Compute dynamic algebraic category bonuses to perfectly satisfy the score equation:
        # final_score = action_total + category_bonuses + recovery_bonuses - risk_penalties
        action_total = sum(e.get("points", 0) for e in session.action_history)
        
        recovery_base = 20 if session.outcome == "win" else 0
        recovery_efficiency_bonus = max(0, 10 - session.recovery_delay) if session.outcome == "win" else 0
        recovery_bonuses = recovery_base + recovery_efficiency_bonus
        
        risk_penalties = max(0, session.wrong_count * 3)
        if session.blast_radius > 50:
            risk_penalties += (session.blast_radius - 50) // 5
            
        category_bonuses = final_score - action_total - recovery_bonuses + risk_penalties
        
        # Absolute safety boundary guard:
        if category_bonuses < 0:
            category_bonuses = 0
            recovery_bonuses = final_score - action_total + risk_penalties
            if recovery_bonuses < 0:
                recovery_bonuses = 0
                risk_penalties = action_total - final_score
                
        # Distribute category_bonuses among the 6 categories proportionally
        factor = category_bonuses / 100.0
        
        c_tech = round(25 * factor)
        c_inv = round(20 * factor)
        c_rec = round(20 * factor)
        c_risk = round(15 * factor)
        c_comm = round(10 * factor)
        c_sla = round(10 * factor)
        
        # Rounding correction so the sum matches category_bonuses exactly
        diff = category_bonuses - (c_tech + c_inv + c_rec + c_risk + c_comm + c_sla)
        if diff != 0:
            c_tech += diff

        # Determine qualitative ratings
        r_investigation = rating_for_ratio(c_inv / 20.0)
        r_decision = rating_for_ratio(c_tech / 25.0)
        r_risk = rating_for_ratio(c_risk / 15.0)
        r_recovery = rating_for_ratio((c_rec + c_sla) / 30.0)
        r_communication = rating_for_ratio(c_comm / 10.0)
        
        overall_verdict = get_overall_verdict(final_score)

        score_breakdown_markdown = f"""
### 📋 Incident Evaluation scorecard

An executive-level operational assessment of the incident triage and recovery lifecycle.

#### Final Evaluation:
* **Investigation Quality**: {r_investigation}
* **Decision Making**: {r_decision}
* **Risk Management**: {r_risk}
* **Recovery Strategy**: {r_recovery}
* **Communication Effectiveness**: {r_communication}

**Overall Verdict:**
{overall_verdict}
"""

        # Build What Went Well dynamically
        what_went_well = []
        if any(k in "".join(actions).lower() for k in ["logs", "describe"]):
            what_went_well.append("✓ Examined application logs before making major changes.")
        if any("get" in a.lower() for a in actions):
            what_went_well.append("✓ Reviewed pod status to gather operational context.")
        if any(k in "".join(actions).lower() for k in ["check", "verify", "status", "describe", "logs", "get"]):
            what_went_well.append("✓ Investigated cluster health before taking recovery actions.")
        if session.correct_count >= 1:
            what_went_well.append("✓ Successfully identified key indicators contributing to the outage.")
            what_went_well.append("✓ Performed actions that supported root-cause investigation.")
        if any(k in "".join(actions).lower() for k in ["apologize", "statement", "status"]):
            what_went_well.append("✓ Dispatched timely and transparent updates to stakeholders.")
        
        if not what_went_well:
            if session.outcome == "win":
                what_went_well = [
                    "✓ Successfully identified key indicators contributing to the outage.",
                    "✓ Performed actions that supported root-cause investigation.",
                    "✓ Investigated cluster health before taking recovery actions."
                ]
            else:
                what_went_well = [
                    "✓ Conducted basic system checks to establish diagnostic boundaries."
                ]

        # Build Areas for Improvement dynamically
        areas_for_improvement = []
        has_scale = any("scale" in a.lower() for a in actions)
        has_restart = any(k in "".join(actions).lower() for k in ["restart", "reboot"])
        has_wrong = len([e for e in session.action_history if e.get("verdict") in ("wrong", "prereq")]) > 0
        
        if has_scale and has_wrong:
            areas_for_improvement.append("⚠ Scaled services before validating resource bottlenecks.")
        if has_restart and has_wrong:
            areas_for_improvement.append("⚠ Restarted components without confirming root cause.")
        if has_wrong:
            areas_for_improvement.append("⚠ Executed actions that increased operational risk.")
            areas_for_improvement.append("⚠ Performed remediation steps with insufficient diagnostic evidence.")
        if session.blast_radius > 50:
            areas_for_improvement.append("⚠ Introduced changes that could have expanded the blast radius.")
        
        if not areas_for_improvement:
            if session.outcome != "win":
                areas_for_improvement = [
                    "⚠ Executed actions that increased operational risk.",
                    "⚠ Performed remediation steps with insufficient diagnostic evidence.",
                    "⚠ Introduced changes that could have expanded the blast radius."
                ]
            else:
                areas_for_improvement = [
                    "⚠ Opportunities remain to optimize command execution footprint to minimize minor recovery delays."
                ]

        what_went_well_str = "\n".join([f"* {d}" for d in what_went_well])
        areas_for_improvement_str = "\n".join([f"* {d}" for d in areas_for_improvement])
        
        decision_analysis_str = build_decision_analysis(session)
        
        decisions_overview = f"""### WHAT WENT WELL

{what_went_well_str}

### AREAS FOR IMPROVEMENT

{areas_for_improvement_str}

### INCIDENT DECISION ANALYSIS

{decision_analysis_str}"""

        categories_breakdown = f"""### Incident Evaluation scorecard
* **Investigation Quality**: {r_investigation} - Diagnostics precision, logs checks, and pod context analysis.
* **Decision Making**: {r_decision} - Command selection efficiency and correct recovery decisions.
* **Risk Management**: {r_risk} - Mitigation of speculative reboots and minimized blast exposure.
* **Recovery Strategy**: {r_recovery} - Containment pacing, playbook adherence, and system stabilization.
* **Communication Effectiveness**: {r_communication} - Active stakeholder mapping and reputation containment.

**Overall Verdict:** {overall_verdict}"""

        # Compute Additional Metrics
        rec_eff = max(10, 100 - session.recovery_delay * 5 - session.wrong_count * 8)
        inv_acc = round(session.correct_count / session.total_questions * 100) if session.total_questions else 100
        op_risk = min(100, 30 + session.wrong_count * 15 + (100 - session.confidence_rating) // 2)
        cust_imp = min(100, session.blast_radius // 2 + session.recovery_delay * 4)
        team_coord = max(20, min(100, session.confidence_rating - session.wrong_count * 5))
        
        additional_metrics = (
            "### Additional Incident Metrics\n"
            f"* **Recovery Efficiency**: {rec_eff}% - Measures duration of active outage state vs SLA limits.\n"
            f"* **Investigation Accuracy**: {inv_acc}% - Ratio of correct diagnostics to total investigative commands.\n"
            f"* **Operational Risk**: {op_risk}% - Accumulated system exposure and blast radius footprint.\n"
            f"* **Customer Impact**: {cust_imp}% - Estimated churn and service-level degradation experienced by active users.\n"
            f"* **Team Coordination**: {team_coord}% - Overall communications efficiency and advisory alignment."
        )

        # Strategic Remediation Opportunities
        narrative_summary = raw_report.get("went_well", "")
        if not narrative_summary:
            if final_score >= 50:
                narrative_summary = "The target cluster has been successfully restored to a healthy state. Metrics show system latency and connection queues have fully returned to baseline thresholds."
            else:
                narrative_summary = "Mitigation efforts failed to recover the target system within acceptable downtime windows. Saturated downstream resources continued to drop client requests, exceeding service-level agreement thresholds."
        
        strategic_remediation = raw_report.get("action_items", "")
        if not strategic_remediation:
            if final_score >= 50:
                strategic_remediation = "Maintain routine telemetry audits and implement proactive staging tests to verify SRE playbooks."
            else:
                strategic_remediation = "IMMEDIATE REMEDIAL INSTRUCTION: The operator must study system dependency mappings, strictly refrain from speculative mutations under load, and verify command prerequisites."

        # Compile structured keys into a flat, valid 8-section Markdown string matching the frontend expectations exactly
        markdown_lines = [
            f"# Incident Postmortem — {title}",
            "",
            f"**Assessment Score:** {final_score}/100  ",
            f"**Operational Status:** {operational_status}  ",
            f"**Operator Performance Profile:** {tone_emoji} {archetype}",
            "",
            "This automated incident retrospective compiles telemetry data, timeline sequences, and operator decisions to evaluate cluster survival, blast radius, and strategic remediation path efficiency.",
            "",
            "---",
            "",
            "## 1. Issue Explanation & Simplified Overview",
            f"A high-severity **{severity}** event degraded services in the **{service}** namespace.",
            f"* **Simplified Explanation**: {s_desc} This outage resulted in request drop cascades, starving downstream microservices and ultimately locking client-facing ingress nodes.",
            f"* **Win Condition**: {scenario_data.get('winCondition', '')}",
            f"* **Lose Condition**: {scenario_data.get('loseCondition', '')}",
            "",
            "---",
            "",
            "## 2. Root Cause & Technical Mechanics",
            "Based on the timeline telemetry records:",
            f"* **Root Cause**: {raw_report.get('rca', root_cause_default)}",
            f"* **Optimal Recovery Path**: {optimal_path}",
            "",
            "---",
            "",
            "## 3. Real Incident Timeline",
            "The following table details the actual chronological progression of the incident and operational responses:",
            "",
            "| Timestamp | Action | System Response | Operational Assessment |",
            "| :--- | :--- | :--- | :--- |",
            timeline_table,
            "",
            "---",
            "",
            "## 4. Operator Decisions & Audits",
            "Every technical decision directly affected cluster survival:",
            f"* **Archetype Summary**: {archetype_details}",
            "* **Action Causality Logs**:",
            causality_section,
            "",
            decisions_overview,
            "",
            "---",
            "",
            "## 5. Investigation Analysis",
            "Evaluation of clues discovered versus telemetry indicators ignored:",
            discovery_logs,
            "",
            "---",
            "",
            "## 6. Stakeholder & Business Impact",
            "Operational outcomes directly impacted organizational metrics:",
            stakeholder_consequences,
            "",
            additional_metrics,
            "",
            "---",
            "",
            "## 7. Strategic Remediation & Opportunities",
            f"* **Narrative Summary**: {narrative_summary}",
            f"* **Action Directive**: {strategic_remediation}",
            "",
            "---",
            "",
            "## 8. Retrospective Scorecard",
            "Executive summary and qualitative evaluation scorecard of the SRE response:",
            score_breakdown_markdown
        ]
        
        return {"postmortem": "\n".join(markdown_lines)}
    
    return {"postmortem": "Active session data expired. Review browser-side fallback logs."}

@app.get("/")
def health():
    return {"status": "ok", "version": "2.0"}