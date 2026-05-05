# FlowForge — Distributed Workflow Automation Platform

## Overview

FlowForge is a distributed workflow automation platform for integrating APIs, databases, and data processing tasks through reliable, event-driven pipelines.

The system allows users to define workflows composed of triggers and steps, execute them asynchronously, monitor their execution, and handle failures in a structured and scalable way.

This project demonstrates real-world backend engineering, distributed systems design, and multi-language system integration using C#, Java, TypeScript, and C++.

---

## Purpose

Modern software systems require constant integration:

- Moving data between APIs and databases
- Automating repetitive workflows
- Scheduling jobs
- Reacting to events (webhooks)

These problems are commonly solved with scripts, cron jobs, or tightly coupled services.

FlowForge provides:

- a centralized workflow system
- reliable execution
- failure handling
- observability
- extensibility

---

## Key Features

### Workflow Management
- Create, update, delete workflows
- Graph-based workflow definition
- JSON-based configuration

### Execution Engine
- Asynchronous execution via queue
- Step-by-step execution
- Retry mechanisms
- Failure handling
- Execution history

### Triggers
- Manual trigger
- Cron-based scheduling
- Webhook trigger

### Actions / Steps
- HTTP request execution
- PostgreSQL query execution
- JSON transformation
- CSV parsing via C++ engine

### Observability
- Execution logs
- Step-level logs
- Status tracking (pending, running, success, failed)

---

## System Architecture

Frontend (React + TypeScript)
↓
C# Backend (API + Orchestration)
↓
PostgreSQL (Workflows, Executions, Logs)
↓
RabbitMQ (Message Queue)
↓
Java Worker (Execution Engine)
↓
C++ Processing Module (High-performance transformations)
↓
External Systems (APIs, Databases)

---

## Technology Stack

### Frontend
- React
- TypeScript
- React Query
- React Flow
- Tailwind CSS

### Backend
- C# (.NET 8)
- ASP.NET Core Web API
- Entity Framework Core
- FluentValidation
- Swagger / OpenAPI

### Worker
- Java 17+
- Spring Boot
- Spring AMQP (RabbitMQ)
- JDBC

### Processing Module
- C++
- CLI-based execution
- High-performance CSV parsing and transformations

### Infrastructure
- PostgreSQL
- RabbitMQ
- Docker
- Docker Compose
- Kubernetes

### DevOps
- GitHub Actions
- CI/CD pipelines

---

## Core Concepts

### Workflow
A workflow is a sequence of steps connected together.

Example:

Trigger → Step → Step → Step

---

### Step
A step is a unit of work:

- HTTP call
- Database operation
- Transformation
- File processing

---

### Trigger
Defines how a workflow starts:

- manual
- scheduled
- webhook

---

### Execution
A runtime instance of a workflow.

---

## Data Model

### workflows
- id
- name
- created_at
- updated_at

### workflow_steps
- id
- workflow_id
- type
- config_json

### workflow_edges
- id
- from_step_id
- to_step_id

### workflow_executions
- id
- workflow_id
- status
- started_at
- finished_at
- error_message

### step_executions
- id
- execution_id
- step_id
- status
- output
- error

### execution_logs
- id
- execution_id
- message
- timestamp

---

## Project Structure

flowforge/
│
├── frontend/              React + TypeScript UI
├── backend/               C# .NET API
├── worker/                Java Spring Boot worker
├── cpp-module/            C++ processing engine
│
├── infra/
│   ├── docker-compose.yml
│   └── k8s/
│
└── README.md

---

## Execution Flow

1. User triggers workflow
2. Backend creates execution record
3. Backend sends message to RabbitMQ
4. Worker consumes message
5. Worker loads workflow
6. Worker executes steps sequentially
7. Worker calls C++ module when needed
8. Results are stored in database
9. Execution marked as success or failure
10. UI displays result

---

## Example Workflow

Manual Trigger
→ HTTP GET https://api.example.com/data
→ Transform JSON
→ Save to PostgreSQL

---

## Workflow Engine Logic

Basic execution algorithm:

for each step in workflow:
    execute step
    if failure:
        retry
        if still fails:
            mark workflow failed
            stop execution
    else:
        continue

---

## C++ Processing Module

The C++ module is responsible for:

- high-performance CSV parsing
- data transformation
- batch processing

It is executed by the Java worker as a CLI tool.

Example:

./processor input.csv output.json

The worker reads the output and continues execution.

---

## API Endpoints

### Workflows

GET /workflows  
POST /workflows  
GET /workflows/{id}  
PUT /workflows/{id}  
DELETE /workflows/{id}  

### Execution

POST /workflows/{id}/run  
GET /executions  
GET /executions/{id}  

---

## Setup Guide

### Requirements

- Docker
- Node.js
- .NET SDK
- Java 17+
- C++ compiler

---

### Run Infrastructure

docker-compose up -d

---

### Backend

cd backend  
dotnet run  

---

### Worker

cd worker  
mvn spring-boot:run  

---

### Frontend

cd frontend  
npm install  
npm run dev  

---

### C++ Module

cd cpp-module  
g++ main.cpp -o processor  

---

## Development Roadmap

### Phase 1
- Setup backend
- Setup database
- Workflow CRUD

### Phase 2
- Add RabbitMQ
- Implement worker
- Basic execution

### Phase 3
- Implement workflow engine
- Add HTTP step
- Add transform step

### Phase 4
- Add scheduling
- Add webhook
- Add retry logic

### Phase 5
- Add logging
- Add metrics
- Improve reliability

### Phase 6
- Integrate C++ module
- Benchmark performance

### Phase 7
- Kubernetes deployment

---

## Testing Strategy

- Unit tests (backend and worker)
- Integration tests (API + DB)
- End-to-end tests (workflow execution)

---

## Non-Functional Requirements

- scalability through workers
- fault tolerance
- observability
- performance optimization
- modular architecture

---

## What This Project Demonstrates

- distributed systems
- event-driven architecture
- backend engineering
- workflow orchestration
- API design
- DevOps practices
- multi-language integration (C#, Java, C++, TypeScript)
- performance engineering

---

## Final Summary

FlowForge is a production-style distributed workflow automation platform that integrates multiple technologies to demonstrate real-world backend engineering, system design, and scalable architecture.



