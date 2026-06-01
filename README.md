# Crisulator

### Built by Team Syn5ergy.exe

Crisulator is an immersive crisis-response simulation platform that helps students and early-career professionals gain hands-on experience handling real-world incidents before they encounter them in industry.

Instead of learning incident response through slides, quizzes, or theory, users are placed directly into realistic crisis scenarios where every decision has consequences.

Users can take on one of three professional roles:

* Software Engineer (SWE)
* Cybersecurity Analyst
* Communications / Public Relations Manager

Each role experiences unique workflows, tools, stakeholders, and success criteria.

---

# The Problem

Students often learn:

* Cloud Computing
* Cybersecurity
* Distributed Systems
* Incident Response
* Crisis Communication

However, very few get the opportunity to experience:

* Production outages
* Security breaches
* Executive pressure
* Public relations crises
* High-stakes decision making

The first exposure to these situations often happens in a real company with real consequences.

Crisulator bridges this gap through experiential learning.

---

# Key Features

## Software Engineering Simulations

Investigate and resolve production incidents using realistic operational tooling.

Examples:

* AWS S3 Outage
* Payments Retry Storm
* Database Failures
* Deployment Failures
* Infrastructure Outages

Available tools:

* Terminal
* Telemetry Dashboard
* GitHub PR Investigation
* SQL Workspace
* Deployment Center
* Incident Timeline

---

## Cybersecurity Simulations

Analyze and contain cyber attacks using a security-focused workflow.

Examples:

* Colonial Pipeline Ransomware
* Credential Theft
* Insider Threats
* Data Breaches
* Malware Incidents

Available tools:

* SIEM Dashboard
* Threat Sandbox
* Access Logs
* Network Investigation
* Containment Controls
* Threat Timeline

---

## Communications & PR Simulations

Manage public trust during organizational crises.

Examples:

* Boeing 737 MAX Crisis
* Data Breach Communications
* Product Recall Events
* Conference & Media Incidents

Available tools:

* Press Conference Feed
* Public Sentiment Dashboard
* Executive Stakeholder Panel
* Response Composer
* Media Monitoring

---

# How It Works

1. Select a role
2. Receive an incident briefing
3. Investigate available evidence
4. Form a hypothesis
5. Execute actions
6. Manage stakeholders
7. Resolve the incident
8. Receive a detailed postmortem

---

# Branching Decision System

Every decision affects the outcome.

Examples:

* Correct diagnosis improves recovery.
* Premature mitigation may worsen the incident.
* Poor communication damages trust.
* Incorrect containment actions can escalate cyber attacks.

Different action sequences produce different outcomes.

---

# Technology Stack

### Frontend

* React.js
* Vite
* Tailwind CSS
* React Router

### Backend

* FastAPI
* Python

### Simulation Engine

* Custom Branching Incident Engine
* Scenario Orchestrator
* Consequence Engine
* State Management System

### Scenario Framework

* YAML Scenario Sources
* Archetypes
* Flavorpacks
* Scenario Compiler

### AI Layer

* LLM-Powered Stakeholder Interactions
* AI Postmortem Generation
* Dynamic Scenario Content

### Data Storage

* SQLite
* JSON Scenario Definitions

---

# Project Structure

```text
frontend/
│
├── src/
├── components/
├── pages/

backend/
│
├── engine/
├── scenarios/
├── archetypes/
├── flavorpacks/
├── tools/

docs/
```

---

# Running Locally

## Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend:

```text
http://localhost:8000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

# Future Vision

Crisulator aims to become a career-readiness platform that helps students develop operational decision-making skills through realistic simulations.

Planned future integrations include:

* LinkedIn Achievement Sharing
* Skill Transcript Generation
* Recruiter Evaluation Dashboard
* Replay Viewer
* Multiplayer Incident Rooms
* Enterprise Training Mode

---

# Team

**Team Name:** Syn5ergy.exe

Built for experiential learning, professional readiness, and crisis management education.

---

# Mission

**Learn by responding, not by watching.**

Crisulator transforms theoretical knowledge into practical crisis-management experience.
