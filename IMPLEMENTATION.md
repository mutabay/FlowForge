# FlowForge — Concrete Implementation Guide

## 0. Goal

Build a distributed workflow automation platform.

The first working version must do this:

1. User creates a workflow in the frontend.
2. User clicks "Run".
3. C# backend creates an execution record.
4. C# backend sends a message to RabbitMQ.
5. Java worker receives the message.
6. Java worker executes the workflow steps.
7. Java worker calls the C++ processor for CSV transformation steps.
8. Results and logs are saved in PostgreSQL.
9. Frontend shows execution status and logs.

---

# 1. Final Tech Stack

## Frontend

- React
- TypeScript
- Vite
- TanStack Query
- React Router
- React Flow
- Tailwind CSS

## Backend API

- C#
- .NET 8
- ASP.NET Core Web API
- Entity Framework Core
- PostgreSQL
- RabbitMQ.Client
- FluentValidation
- Swagger/OpenAPI

## Worker

- Java 21 or Java 17
- Spring Boot
- Spring AMQP
- JDBC or Spring Data JPA
- Jackson
- Resilience4j

## Processing Module

- C++17
- CLI executable
- CSV to JSON processor

## Infrastructure

- Docker
- Docker Compose
- PostgreSQL
- RabbitMQ
- Kubernetes later
- GitHub Actions

---

# 2. Repository Structure

Create this structure:

```text
flowforge/
├── apps/
│   ├── frontend/
│   ├── api/
│   └── worker/
│
├── packages/
│   └── cpp-processor/
│
├── infra/
│   ├── docker-compose.yml
│   └── k8s/
│
├── docs/
│   ├── architecture.md
│   ├── implementation.md
│   ├── api.md
│   └── workflow-engine.md
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── README.md
└── IMPLEMENTATION.md
