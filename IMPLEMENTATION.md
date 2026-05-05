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

- React 18
- TypeScript 5
- Vite 5
- TanStack Query v5
- React Router v6
- React Flow
- Tailwind CSS 3

## Backend API

- C# 12
- .NET 8
- ASP.NET Core Web API
- Entity Framework Core 8
- Npgsql (PostgreSQL provider)
- RabbitMQ.Client 6.x
- FluentValidation
- Swagger/OpenAPI (Swashbuckle)

## Worker

- Java 21 (LTS)
- Spring Boot 3.2+
- Spring AMQP (RabbitMQ)
- Spring Data JPA
- Jackson
- Resilience4j

## Processing Module

- C++17
- CLI executable
- CSV to JSON processor
- nlohmann/json (JSON library)

## Infrastructure

- Docker & Docker Compose
- PostgreSQL 16
- RabbitMQ 3.13 (with management plugin)
- GitHub Actions CI/CD
- Kubernetes (future phase)

---

# 2. Repository Structure

```text
flowforge/
├── apps/
│   ├── frontend/          # React + TypeScript + Vite
│   ├── api/               # C# .NET 8 Web API
│   └── worker/            # Java Spring Boot worker
│
├── packages/
│   └── cpp-processor/     # C++17 CLI tool
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   ├── init-db/
│   │   └── 001-schema.sql
│   └── k8s/
│       ├── namespace.yml
│       ├── postgres.yml
│       ├── rabbitmq.yml
│       ├── api.yml
│       └── worker.yml
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── workflow-engine.md
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── build-images.yml
│
├── .gitignore
├── README.md
└── IMPLEMENTATION.md
```

---

# 3. Infrastructure Setup

## 3.1 Docker Compose

Create `infra/docker-compose.yml`:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    container_name: flowforge-postgres
    environment:
      POSTGRES_USER: flowforge
      POSTGRES_PASSWORD: flowforge_dev
      POSTGRES_DB: flowforge
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U flowforge"]
      interval: 5s
      timeout: 5s
      retries: 5

  rabbitmq:
    image: rabbitmq:3.13-management-alpine
    container_name: flowforge-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: flowforge
      RABBITMQ_DEFAULT_PASS: flowforge_dev
    ports:
      - "5672:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_port_connectivity"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  rabbitmq_data:
```

## 3.2 Development Compose Override

Create `infra/docker-compose.dev.yml` for running the full stack locally:

```yaml
version: "3.9"

services:
  api:
    build:
      context: ../apps/api
      dockerfile: Dockerfile
    container_name: flowforge-api
    environment:
      ConnectionStrings__DefaultConnection: "Host=postgres;Port=5432;Database=flowforge;Username=flowforge;Password=flowforge_dev"
      RabbitMQ__Host: rabbitmq
      RabbitMQ__Username: flowforge
      RabbitMQ__Password: flowforge_dev
    ports:
      - "5000:8080"
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  worker:
    build:
      context: ../apps/worker
      dockerfile: Dockerfile
    container_name: flowforge-worker
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/flowforge
      SPRING_DATASOURCE_USERNAME: flowforge
      SPRING_DATASOURCE_PASSWORD: flowforge_dev
      SPRING_RABBITMQ_HOST: rabbitmq
      SPRING_RABBITMQ_USERNAME: flowforge
      SPRING_RABBITMQ_PASSWORD: flowforge_dev
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
```

## 3.3 Starting Infrastructure

```bash
cd infra
docker-compose up -d
```

Verify:
- PostgreSQL: `psql -h localhost -U flowforge -d flowforge`
- RabbitMQ Management: http://localhost:15672 (flowforge / flowforge_dev)

---

# 4. Database Schema

## 4.1 Initial Schema

Create `infra/init-db/001-schema.sql`:

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Workflow steps
CREATE TABLE workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'http_request', 'db_query', 'transform_json', 'csv_process'
    config JSONB NOT NULL DEFAULT '{}',
    position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Workflow edges (connections between steps)
CREATE TABLE workflow_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    source_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    target_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    UNIQUE(source_step_id, target_step_id)
);

-- Workflow triggers
CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,  -- 'manual', 'cron', 'webhook'
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Workflow executions
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'success', 'failed', 'cancelled'
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Step executions
CREATE TABLE step_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'success', 'failed', 'skipped'
    input JSONB,
    output JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER NOT NULL DEFAULT 0
);

-- Execution logs
CREATE TABLE execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_id UUID REFERENCES workflow_steps(id) ON DELETE SET NULL,
    level VARCHAR(10) NOT NULL DEFAULT 'info',  -- 'debug', 'info', 'warn', 'error'
    message TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_edges_workflow_id ON workflow_edges(workflow_id);
CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);
CREATE INDEX idx_execution_logs_execution_id ON execution_logs(execution_id);
CREATE INDEX idx_execution_logs_created_at ON execution_logs(created_at);
```

## 4.2 Entity Relationship Summary

```
workflows 1──* workflow_steps
workflows 1──* workflow_edges
workflows 1──* workflow_triggers
workflows 1──* workflow_executions
workflow_executions 1──* step_executions
workflow_executions 1──* execution_logs
workflow_steps 1──* step_executions
```

---

# 5. Backend API (C# / .NET 8)

## 5.1 Create the Project

```bash
cd apps/api
dotnet new webapi -n FlowForge.Api --no-https
cd FlowForge.Api

# Add packages
dotnet add package Npgsql.EntityFrameworkCore.PostgreSQL
dotnet add package FluentValidation.AspNetCore
dotnet add package RabbitMQ.Client
dotnet add package Swashbuckle.AspNetCore
```

## 5.2 Project Structure

```text
apps/api/FlowForge.Api/
├── Controllers/
│   ├── WorkflowsController.cs
│   ├── ExecutionsController.cs
│   └── HealthController.cs
├── Models/
│   ├── Workflow.cs
│   ├── WorkflowStep.cs
│   ├── WorkflowEdge.cs
│   ├── WorkflowTrigger.cs
│   ├── WorkflowExecution.cs
│   ├── StepExecution.cs
│   └── ExecutionLog.cs
├── DTOs/
│   ├── CreateWorkflowRequest.cs
│   ├── UpdateWorkflowRequest.cs
│   ├── WorkflowResponse.cs
│   ├── ExecutionResponse.cs
│   └── RunWorkflowRequest.cs
├── Data/
│   └── FlowForgeDbContext.cs
├── Services/
│   ├── IWorkflowService.cs
│   ├── WorkflowService.cs
│   ├── IExecutionService.cs
│   ├── ExecutionService.cs
│   ├── IRabbitMqPublisher.cs
│   └── RabbitMqPublisher.cs
├── Validators/
│   ├── CreateWorkflowValidator.cs
│   └── UpdateWorkflowValidator.cs
├── Middleware/
│   └── ExceptionHandlingMiddleware.cs
├── Configuration/
│   └── RabbitMqSettings.cs
├── Program.cs
├── appsettings.json
├── appsettings.Development.json
└── Dockerfile
```

## 5.3 Models

### `Models/Workflow.cs`

```csharp
namespace FlowForge.Api.Models;

public class Workflow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<WorkflowStep> Steps { get; set; } = new List<WorkflowStep>();
    public ICollection<WorkflowEdge> Edges { get; set; } = new List<WorkflowEdge>();
    public ICollection<WorkflowTrigger> Triggers { get; set; } = new List<WorkflowTrigger>();
    public ICollection<WorkflowExecution> Executions { get; set; } = new List<WorkflowExecution>();
}
```

### `Models/WorkflowStep.cs`

```csharp
namespace FlowForge.Api.Models;

public class WorkflowStep
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;  // http_request, db_query, transform_json, csv_process
    public string Config { get; set; } = "{}";  // JSON string
    public double PositionX { get; set; }
    public double PositionY { get; set; }
    public DateTime CreatedAt { get; set; }

    public Workflow Workflow { get; set; } = null!;
}
```

### `Models/WorkflowEdge.cs`

```csharp
namespace FlowForge.Api.Models;

public class WorkflowEdge
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public Guid SourceStepId { get; set; }
    public Guid TargetStepId { get; set; }

    public Workflow Workflow { get; set; } = null!;
    public WorkflowStep SourceStep { get; set; } = null!;
    public WorkflowStep TargetStep { get; set; } = null!;
}
```

### `Models/WorkflowExecution.cs`

```csharp
namespace FlowForge.Api.Models;

public class WorkflowExecution
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string Status { get; set; } = "pending";
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime CreatedAt { get; set; }

    public Workflow Workflow { get; set; } = null!;
    public ICollection<StepExecution> StepExecutions { get; set; } = new List<StepExecution>();
    public ICollection<ExecutionLog> Logs { get; set; } = new List<ExecutionLog>();
}
```

### `Models/StepExecution.cs`

```csharp
namespace FlowForge.Api.Models;

public class StepExecution
{
    public Guid Id { get; set; }
    public Guid ExecutionId { get; set; }
    public Guid StepId { get; set; }
    public string Status { get; set; } = "pending";
    public string? Input { get; set; }
    public string? Output { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int RetryCount { get; set; }

    public WorkflowExecution Execution { get; set; } = null!;
    public WorkflowStep Step { get; set; } = null!;
}
```

### `Models/ExecutionLog.cs`

```csharp
namespace FlowForge.Api.Models;

public class ExecutionLog
{
    public Guid Id { get; set; }
    public Guid ExecutionId { get; set; }
    public Guid? StepId { get; set; }
    public string Level { get; set; } = "info";
    public string Message { get; set; } = string.Empty;
    public string? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }

    public WorkflowExecution Execution { get; set; } = null!;
}
```

## 5.4 DbContext

### `Data/FlowForgeDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Models;

namespace FlowForge.Api.Data;

public class FlowForgeDbContext : DbContext
{
    public FlowForgeDbContext(DbContextOptions<FlowForgeDbContext> options) : base(options) { }

    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<WorkflowEdge> WorkflowEdges => Set<WorkflowEdge>();
    public DbSet<WorkflowTrigger> WorkflowTriggers => Set<WorkflowTrigger>();
    public DbSet<WorkflowExecution> WorkflowExecutions => Set<WorkflowExecution>();
    public DbSet<StepExecution> StepExecutions => Set<StepExecution>();
    public DbSet<ExecutionLog> ExecutionLogs => Set<ExecutionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Workflow>(entity =>
        {
            entity.ToTable("workflows");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.UpdatedAt).HasColumnName("updated_at");
        });

        modelBuilder.Entity<WorkflowStep>(entity =>
        {
            entity.ToTable("workflow_steps");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(255).IsRequired();
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Config).HasColumnName("config").HasColumnType("jsonb");
            entity.Property(e => e.PositionX).HasColumnName("position_x");
            entity.Property(e => e.PositionY).HasColumnName("position_y");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Steps)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkflowEdge>(entity =>
        {
            entity.ToTable("workflow_edges");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.SourceStepId).HasColumnName("source_step_id");
            entity.Property(e => e.TargetStepId).HasColumnName("target_step_id");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Edges)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SourceStep)
                .WithMany()
                .HasForeignKey(e => e.SourceStepId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.TargetStep)
                .WithMany()
                .HasForeignKey(e => e.TargetStepId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.SourceStepId, e.TargetStepId }).IsUnique();
        });

        modelBuilder.Entity<WorkflowTrigger>(entity =>
        {
            entity.ToTable("workflow_triggers");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Type).HasColumnName("type").HasMaxLength(50).IsRequired();
            entity.Property(e => e.Config).HasColumnName("config").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<WorkflowExecution>(entity =>
        {
            entity.ToTable("workflow_executions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.WorkflowId).HasColumnName("workflow_id");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Workflow)
                .WithMany(w => w.Executions)
                .HasForeignKey(e => e.WorkflowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<StepExecution>(entity =>
        {
            entity.ToTable("step_executions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExecutionId).HasColumnName("execution_id");
            entity.Property(e => e.StepId).HasColumnName("step_id");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20);
            entity.Property(e => e.Input).HasColumnName("input").HasColumnType("jsonb");
            entity.Property(e => e.Output).HasColumnName("output").HasColumnType("jsonb");
            entity.Property(e => e.ErrorMessage).HasColumnName("error_message");
            entity.Property(e => e.StartedAt).HasColumnName("started_at");
            entity.Property(e => e.FinishedAt).HasColumnName("finished_at");
            entity.Property(e => e.RetryCount).HasColumnName("retry_count");

            entity.HasOne(e => e.Execution)
                .WithMany(ex => ex.StepExecutions)
                .HasForeignKey(e => e.ExecutionId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Step)
                .WithMany()
                .HasForeignKey(e => e.StepId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ExecutionLog>(entity =>
        {
            entity.ToTable("execution_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ExecutionId).HasColumnName("execution_id");
            entity.Property(e => e.StepId).HasColumnName("step_id");
            entity.Property(e => e.Level).HasColumnName("level").HasMaxLength(10);
            entity.Property(e => e.Message).HasColumnName("message").IsRequired();
            entity.Property(e => e.Metadata).HasColumnName("metadata").HasColumnType("jsonb");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasOne(e => e.Execution)
                .WithMany(ex => ex.Logs)
                .HasForeignKey(e => e.ExecutionId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
```

## 5.5 DTOs

### `DTOs/CreateWorkflowRequest.cs`

```csharp
namespace FlowForge.Api.DTOs;

public record CreateWorkflowRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<CreateStepRequest> Steps { get; init; } = new();
    public List<CreateEdgeRequest> Edges { get; init; } = new();
    public CreateTriggerRequest? Trigger { get; init; }
}

public record CreateStepRequest
{
    public string TempId { get; init; } = string.Empty;  // Client-side ID for edge mapping
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public object Config { get; init; } = new();
    public double PositionX { get; init; }
    public double PositionY { get; init; }
}

public record CreateEdgeRequest
{
    public string SourceTempId { get; init; } = string.Empty;
    public string TargetTempId { get; init; } = string.Empty;
}

public record CreateTriggerRequest
{
    public string Type { get; init; } = "manual";
    public object Config { get; init; } = new();
}
```

### `DTOs/WorkflowResponse.cs`

```csharp
namespace FlowForge.Api.DTOs;

public record WorkflowResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<StepResponse> Steps { get; init; } = new();
    public List<EdgeResponse> Edges { get; init; } = new();
}

public record StepResponse
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Type { get; init; } = string.Empty;
    public object Config { get; init; } = new();
    public double PositionX { get; init; }
    public double PositionY { get; init; }
}

public record EdgeResponse
{
    public Guid Id { get; init; }
    public Guid SourceStepId { get; init; }
    public Guid TargetStepId { get; init; }
}

public record ExecutionResponse
{
    public Guid Id { get; init; }
    public Guid WorkflowId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<StepExecutionResponse> Steps { get; init; } = new();
    public List<LogResponse> Logs { get; init; } = new();
}

public record StepExecutionResponse
{
    public Guid Id { get; init; }
    public Guid StepId { get; init; }
    public string Status { get; init; } = string.Empty;
    public object? Output { get; init; }
    public string? ErrorMessage { get; init; }
    public int RetryCount { get; init; }
}

public record LogResponse
{
    public Guid Id { get; init; }
    public string Level { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}
```

## 5.6 RabbitMQ Publisher

### `Configuration/RabbitMqSettings.cs`

```csharp
namespace FlowForge.Api.Configuration;

public class RabbitMqSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 5672;
    public string Username { get; set; } = "guest";
    public string Password { get; set; } = "guest";
    public string ExchangeName { get; set; } = "flowforge.executions";
    public string QueueName { get; set; } = "flowforge.executions.queue";
    public string RoutingKey { get; set; } = "execution.start";
}
```

### `Services/IRabbitMqPublisher.cs`

```csharp
namespace FlowForge.Api.Services;

public interface IRabbitMqPublisher
{
    Task PublishExecutionMessage(Guid executionId, Guid workflowId);
}
```

### `Services/RabbitMqPublisher.cs`

```csharp
using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using FlowForge.Api.Configuration;
using Microsoft.Extensions.Options;

namespace FlowForge.Api.Services;

public class RabbitMqPublisher : IRabbitMqPublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly RabbitMqSettings _settings;

    public RabbitMqPublisher(IOptions<RabbitMqSettings> settings)
    {
        _settings = settings.Value;

        var factory = new ConnectionFactory
        {
            HostName = _settings.Host,
            Port = _settings.Port,
            UserName = _settings.Username,
            Password = _settings.Password
        };

        _connection = factory.CreateConnection();
        _channel = _connection.CreateModel();

        _channel.ExchangeDeclare(_settings.ExchangeName, ExchangeType.Direct, durable: true);
        _channel.QueueDeclare(_settings.QueueName, durable: true, exclusive: false, autoDelete: false);
        _channel.QueueBind(_settings.QueueName, _settings.ExchangeName, _settings.RoutingKey);
    }

    public Task PublishExecutionMessage(Guid executionId, Guid workflowId)
    {
        var message = new
        {
            ExecutionId = executionId,
            WorkflowId = workflowId,
            Timestamp = DateTime.UtcNow
        };

        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

        var properties = _channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        _channel.BasicPublish(
            exchange: _settings.ExchangeName,
            routingKey: _settings.RoutingKey,
            basicProperties: properties,
            body: body
        );

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        _channel?.Close();
        _connection?.Close();
    }
}
```

## 5.7 Workflow Service

### `Services/IWorkflowService.cs`

```csharp
using FlowForge.Api.DTOs;

namespace FlowForge.Api.Services;

public interface IWorkflowService
{
    Task<List<WorkflowResponse>> GetAllAsync();
    Task<WorkflowResponse?> GetByIdAsync(Guid id);
    Task<WorkflowResponse> CreateAsync(CreateWorkflowRequest request);
    Task<WorkflowResponse?> UpdateAsync(Guid id, CreateWorkflowRequest request);
    Task<bool> DeleteAsync(Guid id);
}
```

### `Services/WorkflowService.cs`

```csharp
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Data;
using FlowForge.Api.DTOs;
using FlowForge.Api.Models;

namespace FlowForge.Api.Services;

public class WorkflowService : IWorkflowService
{
    private readonly FlowForgeDbContext _db;

    public WorkflowService(FlowForgeDbContext db)
    {
        _db = db;
    }

    public async Task<List<WorkflowResponse>> GetAllAsync()
    {
        var workflows = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .OrderByDescending(w => w.UpdatedAt)
            .ToListAsync();

        return workflows.Select(MapToResponse).ToList();
    }

    public async Task<WorkflowResponse?> GetByIdAsync(Guid id)
    {
        var workflow = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .FirstOrDefaultAsync(w => w.Id == id);

        return workflow == null ? null : MapToResponse(workflow);
    }

    public async Task<WorkflowResponse> CreateAsync(CreateWorkflowRequest request)
    {
        var workflow = new Workflow
        {
            Name = request.Name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.Workflows.Add(workflow);

        // Map temp IDs to real IDs
        var tempIdMap = new Dictionary<string, Guid>();

        foreach (var stepReq in request.Steps)
        {
            var step = new WorkflowStep
            {
                WorkflowId = workflow.Id,
                Name = stepReq.Name,
                Type = stepReq.Type,
                Config = JsonSerializer.Serialize(stepReq.Config),
                PositionX = stepReq.PositionX,
                PositionY = stepReq.PositionY,
                CreatedAt = DateTime.UtcNow
            };
            _db.WorkflowSteps.Add(step);
            tempIdMap[stepReq.TempId] = step.Id;
        }

        foreach (var edgeReq in request.Edges)
        {
            if (tempIdMap.TryGetValue(edgeReq.SourceTempId, out var sourceId) &&
                tempIdMap.TryGetValue(edgeReq.TargetTempId, out var targetId))
            {
                var edge = new WorkflowEdge
                {
                    WorkflowId = workflow.Id,
                    SourceStepId = sourceId,
                    TargetStepId = targetId
                };
                _db.WorkflowEdges.Add(edge);
            }
        }

        if (request.Trigger != null)
        {
            var trigger = new WorkflowTrigger
            {
                WorkflowId = workflow.Id,
                Type = request.Trigger.Type,
                Config = JsonSerializer.Serialize(request.Trigger.Config),
                CreatedAt = DateTime.UtcNow
            };
            _db.WorkflowTriggers.Add(trigger);
        }

        await _db.SaveChangesAsync();

        return (await GetByIdAsync(workflow.Id))!;
    }

    public async Task<WorkflowResponse?> UpdateAsync(Guid id, CreateWorkflowRequest request)
    {
        var workflow = await _db.Workflows
            .Include(w => w.Steps)
            .Include(w => w.Edges)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null) return null;

        // Remove old steps and edges
        _db.WorkflowEdges.RemoveRange(workflow.Edges);
        _db.WorkflowSteps.RemoveRange(workflow.Steps);

        workflow.Name = request.Name;
        workflow.Description = request.Description;
        workflow.UpdatedAt = DateTime.UtcNow;

        var tempIdMap = new Dictionary<string, Guid>();

        foreach (var stepReq in request.Steps)
        {
            var step = new WorkflowStep
            {
                WorkflowId = workflow.Id,
                Name = stepReq.Name,
                Type = stepReq.Type,
                Config = JsonSerializer.Serialize(stepReq.Config),
                PositionX = stepReq.PositionX,
                PositionY = stepReq.PositionY,
                CreatedAt = DateTime.UtcNow
            };
            _db.WorkflowSteps.Add(step);
            tempIdMap[stepReq.TempId] = step.Id;
        }

        foreach (var edgeReq in request.Edges)
        {
            if (tempIdMap.TryGetValue(edgeReq.SourceTempId, out var sourceId) &&
                tempIdMap.TryGetValue(edgeReq.TargetTempId, out var targetId))
            {
                var edge = new WorkflowEdge
                {
                    WorkflowId = workflow.Id,
                    SourceStepId = sourceId,
                    TargetStepId = targetId
                };
                _db.WorkflowEdges.Add(edge);
            }
        }

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(workflow.Id))!;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var workflow = await _db.Workflows.FindAsync(id);
        if (workflow == null) return false;

        _db.Workflows.Remove(workflow);
        await _db.SaveChangesAsync();
        return true;
    }

    private static WorkflowResponse MapToResponse(Workflow w) => new()
    {
        Id = w.Id,
        Name = w.Name,
        Description = w.Description,
        IsActive = w.IsActive,
        CreatedAt = w.CreatedAt,
        UpdatedAt = w.UpdatedAt,
        Steps = w.Steps.Select(s => new StepResponse
        {
            Id = s.Id,
            Name = s.Name,
            Type = s.Type,
            Config = JsonSerializer.Deserialize<object>(s.Config) ?? new { },
            PositionX = s.PositionX,
            PositionY = s.PositionY
        }).ToList(),
        Edges = w.Edges.Select(e => new EdgeResponse
        {
            Id = e.Id,
            SourceStepId = e.SourceStepId,
            TargetStepId = e.TargetStepId
        }).ToList()
    };
}
```

## 5.8 Execution Service

### `Services/IExecutionService.cs`

```csharp
using FlowForge.Api.DTOs;

namespace FlowForge.Api.Services;

public interface IExecutionService
{
    Task<ExecutionResponse> RunWorkflowAsync(Guid workflowId);
    Task<List<ExecutionResponse>> GetAllAsync();
    Task<ExecutionResponse?> GetByIdAsync(Guid id);
    Task<List<ExecutionResponse>> GetByWorkflowIdAsync(Guid workflowId);
}
```

### `Services/ExecutionService.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Data;
using FlowForge.Api.DTOs;
using FlowForge.Api.Models;

namespace FlowForge.Api.Services;

public class ExecutionService : IExecutionService
{
    private readonly FlowForgeDbContext _db;
    private readonly IRabbitMqPublisher _publisher;

    public ExecutionService(FlowForgeDbContext db, IRabbitMqPublisher publisher)
    {
        _db = db;
        _publisher = publisher;
    }

    public async Task<ExecutionResponse> RunWorkflowAsync(Guid workflowId)
    {
        var workflow = await _db.Workflows.FindAsync(workflowId);
        if (workflow == null)
            throw new KeyNotFoundException($"Workflow {workflowId} not found");

        var execution = new WorkflowExecution
        {
            WorkflowId = workflowId,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        _db.WorkflowExecutions.Add(execution);
        await _db.SaveChangesAsync();

        // Publish to RabbitMQ for worker to pick up
        await _publisher.PublishExecutionMessage(execution.Id, workflowId);

        return MapToResponse(execution);
    }

    public async Task<List<ExecutionResponse>> GetAllAsync()
    {
        var executions = await _db.WorkflowExecutions
            .Include(e => e.StepExecutions)
            .Include(e => e.Logs)
            .OrderByDescending(e => e.CreatedAt)
            .Take(50)
            .ToListAsync();

        return executions.Select(MapToResponse).ToList();
    }

    public async Task<ExecutionResponse?> GetByIdAsync(Guid id)
    {
        var execution = await _db.WorkflowExecutions
            .Include(e => e.StepExecutions)
            .Include(e => e.Logs.OrderBy(l => l.CreatedAt))
            .FirstOrDefaultAsync(e => e.Id == id);

        return execution == null ? null : MapToResponse(execution);
    }

    public async Task<List<ExecutionResponse>> GetByWorkflowIdAsync(Guid workflowId)
    {
        var executions = await _db.WorkflowExecutions
            .Where(e => e.WorkflowId == workflowId)
            .Include(e => e.StepExecutions)
            .OrderByDescending(e => e.CreatedAt)
            .Take(20)
            .ToListAsync();

        return executions.Select(MapToResponse).ToList();
    }

    private static ExecutionResponse MapToResponse(WorkflowExecution e) => new()
    {
        Id = e.Id,
        WorkflowId = e.WorkflowId,
        Status = e.Status,
        StartedAt = e.StartedAt,
        FinishedAt = e.FinishedAt,
        ErrorMessage = e.ErrorMessage,
        CreatedAt = e.CreatedAt,
        Steps = e.StepExecutions?.Select(s => new StepExecutionResponse
        {
            Id = s.Id,
            StepId = s.StepId,
            Status = s.Status,
            Output = s.Output,
            ErrorMessage = s.ErrorMessage,
            RetryCount = s.RetryCount
        }).ToList() ?? new(),
        Logs = e.Logs?.Select(l => new LogResponse
        {
            Id = l.Id,
            Level = l.Level,
            Message = l.Message,
            CreatedAt = l.CreatedAt
        }).ToList() ?? new()
    };
}
```

## 5.9 Controllers

### `Controllers/WorkflowsController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using FlowForge.Api.DTOs;
using FlowForge.Api.Services;

namespace FlowForge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WorkflowsController : ControllerBase
{
    private readonly IWorkflowService _workflowService;
    private readonly IExecutionService _executionService;

    public WorkflowsController(IWorkflowService workflowService, IExecutionService executionService)
    {
        _workflowService = workflowService;
        _executionService = executionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<WorkflowResponse>>> GetAll()
    {
        var workflows = await _workflowService.GetAllAsync();
        return Ok(workflows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkflowResponse>> GetById(Guid id)
    {
        var workflow = await _workflowService.GetByIdAsync(id);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    [HttpPost]
    public async Task<ActionResult<WorkflowResponse>> Create([FromBody] CreateWorkflowRequest request)
    {
        var workflow = await _workflowService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = workflow.Id }, workflow);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkflowResponse>> Update(Guid id, [FromBody] CreateWorkflowRequest request)
    {
        var workflow = await _workflowService.UpdateAsync(id, request);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _workflowService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id:guid}/run")]
    public async Task<ActionResult<ExecutionResponse>> Run(Guid id)
    {
        var execution = await _executionService.RunWorkflowAsync(id);
        return Accepted(execution);
    }

    [HttpGet("{id:guid}/executions")]
    public async Task<ActionResult<List<ExecutionResponse>>> GetExecutions(Guid id)
    {
        var executions = await _executionService.GetByWorkflowIdAsync(id);
        return Ok(executions);
    }
}
```

### `Controllers/ExecutionsController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;
using FlowForge.Api.DTOs;
using FlowForge.Api.Services;

namespace FlowForge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExecutionsController : ControllerBase
{
    private readonly IExecutionService _executionService;

    public ExecutionsController(IExecutionService executionService)
    {
        _executionService = executionService;
    }

    [HttpGet]
    public async Task<ActionResult<List<ExecutionResponse>>> GetAll()
    {
        var executions = await _executionService.GetAllAsync();
        return Ok(executions);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ExecutionResponse>> GetById(Guid id)
    {
        var execution = await _executionService.GetByIdAsync(id);
        if (execution == null) return NotFound();
        return Ok(execution);
    }
}
```

### `Controllers/HealthController.cs`

```csharp
using Microsoft.AspNetCore.Mvc;

namespace FlowForge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
}
```

## 5.10 Exception Handling Middleware

### `Middleware/ExceptionHandlingMiddleware.cs`

```csharp
using System.Net;
using System.Text.Json;

namespace FlowForge.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found");
            context.Response.StatusCode = (int)HttpStatusCode.NotFound;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = ex.Message }));
        }
        catch (FluentValidation.ValidationException ex)
        {
            _logger.LogWarning(ex, "Validation failed");
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            context.Response.ContentType = "application/json";
            var errors = ex.Errors.Select(e => new { field = e.PropertyName, message = e.ErrorMessage });
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { errors }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new { error = "An internal error occurred" }));
        }
    }
}
```

## 5.11 Program.cs

```csharp
using Microsoft.EntityFrameworkCore;
using FlowForge.Api.Configuration;
using FlowForge.Api.Data;
using FlowForge.Api.Middleware;
using FlowForge.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Database
builder.Services.AddDbContext<FlowForgeDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// RabbitMQ
builder.Services.Configure<RabbitMqSettings>(builder.Configuration.GetSection("RabbitMQ"));
builder.Services.AddSingleton<IRabbitMqPublisher, RabbitMqPublisher>();

// Services
builder.Services.AddScoped<IWorkflowService, WorkflowService>();
builder.Services.AddScoped<IExecutionService, ExecutionService>();

// Controllers
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "FlowForge API", Version = "v1" });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

var app = builder.Build();

// Middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");
app.MapControllers();

app.Run();
```

## 5.12 Configuration Files

### `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Port=5432;Database=flowforge;Username=flowforge;Password=flowforge_dev"
  },
  "RabbitMQ": {
    "Host": "localhost",
    "Port": 5672,
    "Username": "flowforge",
    "Password": "flowforge_dev",
    "ExchangeName": "flowforge.executions",
    "QueueName": "flowforge.executions.queue",
    "RoutingKey": "execution.start"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

## 5.13 Dockerfile

### `apps/api/Dockerfile`

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY FlowForge.Api/*.csproj ./FlowForge.Api/
RUN dotnet restore FlowForge.Api/FlowForge.Api.csproj
COPY . .
WORKDIR /src/FlowForge.Api
RUN dotnet publish -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "FlowForge.Api.dll"]
```

---

# 6. Java Worker (Spring Boot)

## 6.1 Create the Project

Use Spring Initializr (https://start.spring.io) or create manually:

- **Group**: com.flowforge
- **Artifact**: worker
- **Dependencies**: Spring AMQP, Spring Data JPA, PostgreSQL Driver, Spring Web (for health endpoints)

Or use Maven:

```bash
cd apps/worker
mvn archetype:generate \
  -DgroupId=com.flowforge \
  -DartifactId=worker \
  -DarchetypeArtifactId=maven-archetype-quickstart
```

## 6.2 Project Structure

```text
apps/worker/
├── src/main/java/com/flowforge/worker/
│   ├── WorkerApplication.java
│   ├── config/
│   │   ├── RabbitMqConfig.java
│   │   └── ProcessorConfig.java
│   ├── listener/
│   │   └── ExecutionListener.java
│   ├── engine/
│   │   ├── WorkflowEngine.java
│   │   ├── StepExecutor.java
│   │   └── steps/
│   │       ├── HttpRequestStep.java
│   │       ├── DbQueryStep.java
│   │       ├── JsonTransformStep.java
│   │       └── CsvProcessStep.java
│   ├── model/
│   │   ├── ExecutionMessage.java
│   │   ├── WorkflowData.java
│   │   ├── StepData.java
│   │   └── EdgeData.java
│   ├── repository/
│   │   ├── WorkflowRepository.java
│   │   ├── ExecutionRepository.java
│   │   ├── StepExecutionRepository.java
│   │   └── ExecutionLogRepository.java
│   └── service/
│       ├── ExecutionService.java
│       └── LogService.java
├── src/main/resources/
│   └── application.yml
├── pom.xml
└── Dockerfile
```

## 6.3 pom.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
    </parent>

    <groupId>com.flowforge</groupId>
    <artifactId>worker</artifactId>
    <version>1.0.0</version>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-amqp</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>io.github.resilience4j</groupId>
            <artifactId>resilience4j-spring-boot3</artifactId>
            <version>2.2.0</version>
        </dependency>
        <dependency>
            <groupId>io.github.resilience4j</groupId>
            <artifactId>resilience4j-retry</artifactId>
            <version>2.2.0</version>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

## 6.4 Application Configuration

### `src/main/resources/application.yml`

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/flowforge
    username: flowforge
    password: flowforge_dev
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  rabbitmq:
    host: localhost
    port: 5672
    username: flowforge
    password: flowforge_dev

flowforge:
  processor:
    path: /opt/flowforge/processor
  execution:
    max-retries: 3
    retry-delay-ms: 1000

server:
  port: 8081
```

## 6.5 RabbitMQ Configuration

### `config/RabbitMqConfig.java`

```java
package com.flowforge.worker.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.listener.SimpleMessageListenerContainer;
import org.springframework.amqp.rabbit.listener.adapter.MessageListenerAdapter;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_NAME = "flowforge.executions";
    public static final String QUEUE_NAME = "flowforge.executions.queue";
    public static final String ROUTING_KEY = "execution.start";

    @Bean
    public DirectExchange exchange() {
        return new DirectExchange(EXCHANGE_NAME, true, false);
    }

    @Bean
    public Queue queue() {
        return QueueBuilder.durable(QUEUE_NAME).build();
    }

    @Bean
    public Binding binding(Queue queue, DirectExchange exchange) {
        return BindingBuilder.bind(queue).to(exchange).with(ROUTING_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }
}
```

## 6.6 Message Model

### `model/ExecutionMessage.java`

```java
package com.flowforge.worker.model;

import java.time.Instant;
import java.util.UUID;

public record ExecutionMessage(
    UUID executionId,
    UUID workflowId,
    Instant timestamp
) {}
```

## 6.7 JPA Entities

### `model/WorkflowData.java`

```java
package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "workflows")
public class WorkflowData {
    @Id
    private UUID id;

    private String name;

    @Column(name = "is_active")
    private boolean isActive;

    @OneToMany(mappedBy = "workflow", fetch = FetchType.EAGER)
    private List<StepData> steps;

    @OneToMany(mappedBy = "workflow", fetch = FetchType.EAGER)
    private List<EdgeData> edges;

    // Getters and setters
    public UUID getId() { return id; }
    public String getName() { return name; }
    public boolean isActive() { return isActive; }
    public List<StepData> getSteps() { return steps; }
    public List<EdgeData> getEdges() { return edges; }
}
```

### `model/StepData.java`

```java
package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "workflow_steps")
public class StepData {
    @Id
    private UUID id;

    @Column(name = "workflow_id")
    private UUID workflowId;

    private String name;
    private String type;

    @Column(columnDefinition = "jsonb")
    private String config;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", insertable = false, updatable = false)
    private WorkflowData workflow;

    // Getters
    public UUID getId() { return id; }
    public UUID getWorkflowId() { return workflowId; }
    public String getName() { return name; }
    public String getType() { return type; }
    public String getConfig() { return config; }
}
```

### `model/EdgeData.java`

```java
package com.flowforge.worker.model;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "workflow_edges")
public class EdgeData {
    @Id
    private UUID id;

    @Column(name = "workflow_id")
    private UUID workflowId;

    @Column(name = "source_step_id")
    private UUID sourceStepId;

    @Column(name = "target_step_id")
    private UUID targetStepId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workflow_id", insertable = false, updatable = false)
    private WorkflowData workflow;

    // Getters
    public UUID getId() { return id; }
    public UUID getSourceStepId() { return sourceStepId; }
    public UUID getTargetStepId() { return targetStepId; }
}
```

## 6.8 Execution Listener

### `listener/ExecutionListener.java`

```java
package com.flowforge.worker.listener;

import com.flowforge.worker.engine.WorkflowEngine;
import com.flowforge.worker.model.ExecutionMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ExecutionListener {

    private static final Logger log = LoggerFactory.getLogger(ExecutionListener.class);
    private final WorkflowEngine engine;

    public ExecutionListener(WorkflowEngine engine) {
        this.engine = engine;
    }

    @RabbitListener(queues = "flowforge.executions.queue")
    public void onMessage(ExecutionMessage message) {
        log.info("Received execution request: executionId={}, workflowId={}",
                message.executionId(), message.workflowId());

        try {
            engine.execute(message.executionId(), message.workflowId());
        } catch (Exception e) {
            log.error("Failed to execute workflow: {}", e.getMessage(), e);
        }
    }
}
```

## 6.9 Workflow Engine

### `engine/WorkflowEngine.java`

```java
package com.flowforge.worker.engine;

import com.flowforge.worker.model.*;
import com.flowforge.worker.repository.*;
import com.flowforge.worker.service.LogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class WorkflowEngine {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEngine.class);

    private final WorkflowRepository workflowRepo;
    private final ExecutionRepository executionRepo;
    private final StepExecutionRepository stepExecRepo;
    private final StepExecutor stepExecutor;
    private final LogService logService;

    public WorkflowEngine(
            WorkflowRepository workflowRepo,
            ExecutionRepository executionRepo,
            StepExecutionRepository stepExecRepo,
            StepExecutor stepExecutor,
            LogService logService) {
        this.workflowRepo = workflowRepo;
        this.executionRepo = executionRepo;
        this.stepExecRepo = stepExecRepo;
        this.stepExecutor = stepExecutor;
        this.logService = logService;
    }

    @Transactional
    public void execute(UUID executionId, UUID workflowId) {
        // Mark execution as running
        executionRepo.updateStatus(executionId, "running", Instant.now(), null, null);
        logService.log(executionId, null, "info", "Execution started");

        // Load workflow
        WorkflowData workflow = workflowRepo.findById(workflowId)
                .orElseThrow(() -> new RuntimeException("Workflow not found: " + workflowId));

        // Build execution order using topological sort
        List<StepData> orderedSteps = topologicalSort(workflow.getSteps(), workflow.getEdges());

        logService.log(executionId, null, "info",
                "Executing " + orderedSteps.size() + " steps");

        String previousOutput = null;

        for (StepData step : orderedSteps) {
            UUID stepExecId = UUID.randomUUID();

            try {
                // Create step execution record
                stepExecRepo.insertStepExecution(stepExecId, executionId, step.getId(),
                        "running", previousOutput, Instant.now());

                logService.log(executionId, step.getId(), "info",
                        "Executing step: " + step.getName() + " (type: " + step.getType() + ")");

                // Execute the step
                String output = stepExecutor.execute(step, previousOutput);

                // Mark step as success
                stepExecRepo.updateStepExecution(stepExecId, "success", output, null, Instant.now());
                logService.log(executionId, step.getId(), "info", "Step completed successfully");

                previousOutput = output;

            } catch (Exception e) {
                log.error("Step execution failed: step={}, error={}", step.getName(), e.getMessage());
                stepExecRepo.updateStepExecution(stepExecId, "failed", null, e.getMessage(), Instant.now());
                logService.log(executionId, step.getId(), "error",
                        "Step failed: " + e.getMessage());

                // Mark entire execution as failed
                executionRepo.updateStatus(executionId, "failed", null, Instant.now(), e.getMessage());
                logService.log(executionId, null, "error", "Execution failed at step: " + step.getName());
                return;
            }
        }

        // Mark execution as success
        executionRepo.updateStatus(executionId, "success", null, Instant.now(), null);
        logService.log(executionId, null, "info", "Execution completed successfully");
    }

    private List<StepData> topologicalSort(List<StepData> steps, List<EdgeData> edges) {
        Map<UUID, StepData> stepMap = new HashMap<>();
        Map<UUID, List<UUID>> adjacency = new HashMap<>();
        Map<UUID, Integer> inDegree = new HashMap<>();

        for (StepData step : steps) {
            stepMap.put(step.getId(), step);
            adjacency.put(step.getId(), new ArrayList<>());
            inDegree.put(step.getId(), 0);
        }

        for (EdgeData edge : edges) {
            adjacency.get(edge.getSourceStepId()).add(edge.getTargetStepId());
            inDegree.merge(edge.getTargetStepId(), 1, Integer::sum);
        }

        Queue<UUID> queue = new LinkedList<>();
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.add(entry.getKey());
            }
        }

        List<StepData> result = new ArrayList<>();
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            result.add(stepMap.get(current));

            for (UUID neighbor : adjacency.get(current)) {
                inDegree.merge(neighbor, -1, Integer::sum);
                if (inDegree.get(neighbor) == 0) {
                    queue.add(neighbor);
                }
            }
        }

        if (result.size() != steps.size()) {
            throw new RuntimeException("Workflow contains a cycle");
        }

        return result;
    }
}
```

## 6.10 Step Executor

### `engine/StepExecutor.java`

```java
package com.flowforge.worker.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.worker.model.StepData;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

@Component
public class StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(StepExecutor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;

    @Value("${flowforge.processor.path:/opt/flowforge/processor}")
    private String processorPath;

    public StepExecutor() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public String execute(StepData step, String previousOutput) throws Exception {
        JsonNode config = objectMapper.readTree(step.getConfig());

        return switch (step.getType()) {
            case "http_request" -> executeHttpRequest(config, previousOutput);
            case "transform_json" -> executeJsonTransform(config, previousOutput);
            case "csv_process" -> executeCsvProcess(config, previousOutput);
            case "db_query" -> executeDbQuery(config, previousOutput);
            default -> throw new IllegalArgumentException("Unknown step type: " + step.getType());
        };
    }

    private String executeHttpRequest(JsonNode config, String previousOutput) throws Exception {
        String method = config.has("method") ? config.get("method").asText() : "GET";
        String url = config.get("url").asText();

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30));

        if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)) {
            String body = config.has("body") ? config.get("body").toString() : previousOutput != null ? previousOutput : "";
            builder.method(method, HttpRequest.BodyPublishers.ofString(body));
            builder.header("Content-Type", "application/json");
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        }

        // Add headers from config
        if (config.has("headers")) {
            config.get("headers").fields().forEachRemaining(entry ->
                    builder.header(entry.getKey(), entry.getValue().asText()));
        }

        HttpResponse<String> response = httpClient.send(builder.build(),
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP request failed with status " + response.statusCode());
        }

        return response.body();
    }

    private String executeJsonTransform(JsonNode config, String previousOutput) throws Exception {
        if (previousOutput == null) {
            throw new RuntimeException("No input data for JSON transform");
        }

        // Simple field extraction / mapping
        String expression = config.has("expression") ? config.get("expression").asText() : null;

        if (expression != null) {
            JsonNode input = objectMapper.readTree(previousOutput);
            // Simple JSONPath-like extraction (e.g., "$.data" or "$.items")
            String[] parts = expression.replace("$.", "").split("\\.");
            JsonNode current = input;
            for (String part : parts) {
                if (current.has(part)) {
                    current = current.get(part);
                } else {
                    throw new RuntimeException("Field not found: " + part);
                }
            }
            return objectMapper.writeValueAsString(current);
        }

        return previousOutput;
    }

    private String executeCsvProcess(JsonNode config, String previousOutput) throws Exception {
        // Write input to temp file
        Path inputFile = Files.createTempFile("flowforge-input-", ".csv");
        Path outputFile = Files.createTempFile("flowforge-output-", ".json");

        try {
            if (previousOutput != null) {
                Files.writeString(inputFile, previousOutput);
            } else if (config.has("input_file")) {
                inputFile = Path.of(config.get("input_file").asText());
            }

            // Call C++ processor
            ProcessBuilder pb = new ProcessBuilder(processorPath,
                    inputFile.toString(), outputFile.toString());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String processOutput = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("CSV processor failed (exit code " + exitCode + "): " + processOutput);
            }

            return Files.readString(outputFile);

        } finally {
            Files.deleteIfExists(inputFile);
            Files.deleteIfExists(outputFile);
        }
    }

    private String executeDbQuery(JsonNode config, String previousOutput) throws Exception {
        // This would use a separate DataSource to execute queries
        // For now, return a placeholder
        throw new UnsupportedOperationException("DB query step not yet implemented");
    }
}
```

## 6.11 Repositories

### `repository/WorkflowRepository.java`

```java
package com.flowforge.worker.repository;

import com.flowforge.worker.model.WorkflowData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface WorkflowRepository extends JpaRepository<WorkflowData, UUID> {
}
```

### `repository/ExecutionRepository.java`

```java
package com.flowforge.worker.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

public interface ExecutionRepository extends Repository<Object, UUID> {

    @Modifying
    @Transactional
    @Query(value = """
        UPDATE workflow_executions
        SET status = :status,
            started_at = COALESCE(:startedAt, started_at),
            finished_at = COALESCE(:finishedAt, finished_at),
            error_message = :errorMessage
        WHERE id = :id
    """, nativeQuery = true)
    void updateStatus(UUID id, String status, Instant startedAt, Instant finishedAt, String errorMessage);
}
```

### `repository/StepExecutionRepository.java`

```java
package com.flowforge.worker.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

public interface StepExecutionRepository extends Repository<Object, UUID> {

    @Modifying
    @Transactional
    @Query(value = """
        INSERT INTO step_executions (id, execution_id, step_id, status, input, started_at)
        VALUES (:id, :executionId, :stepId, :status, CAST(:input AS jsonb), :startedAt)
    """, nativeQuery = true)
    void insertStepExecution(UUID id, UUID executionId, UUID stepId, String status,
                             String input, Instant startedAt);

    @Modifying
    @Transactional
    @Query(value = """
        UPDATE step_executions
        SET status = :status,
            output = CAST(:output AS jsonb),
            error_message = :errorMessage,
            finished_at = :finishedAt
        WHERE id = :id
    """, nativeQuery = true)
    void updateStepExecution(UUID id, String status, String output, String errorMessage, Instant finishedAt);
}
```

## 6.12 Log Service

### `service/LogService.java`

```java
package com.flowforge.worker.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class LogService {

    private final JdbcTemplate jdbc;

    public LogService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void log(UUID executionId, UUID stepId, String level, String message) {
        jdbc.update("""
            INSERT INTO execution_logs (id, execution_id, step_id, level, message, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        """, UUID.randomUUID(), executionId, stepId, level, message);
    }
}
```

## 6.13 Dockerfile

### `apps/worker/Dockerfile`

```dockerfile
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-alpine AS runtime
WORKDIR /app
COPY --from=build /app/target/worker-1.0.0.jar app.jar
COPY --from=cpp-processor /app/processor /opt/flowforge/processor
EXPOSE 8081
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

# 7. C++ Processing Module

## 7.1 Overview

The C++ processor is a CLI tool that converts CSV files to JSON. It is called by the Java worker as a subprocess.

**Usage**: `./processor <input.csv> <output.json>`

## 7.2 Project Structure

```text
packages/cpp-processor/
├── src/
│   ├── main.cpp
│   ├── csv_parser.h
│   ├── csv_parser.cpp
│   ├── json_writer.h
│   └── json_writer.cpp
├── include/
│   └── nlohmann/
│       └── json.hpp
├── tests/
│   ├── test_parser.cpp
│   └── test_data/
│       └── sample.csv
├── CMakeLists.txt
├── Dockerfile
└── README.md
```

## 7.3 CMakeLists.txt

```cmake
cmake_minimum_required(VERSION 3.16)
project(flowforge-processor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Download nlohmann/json
include(FetchContent)
FetchContent_Declare(json
    URL https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

add_executable(processor
    src/main.cpp
    src/csv_parser.cpp
    src/json_writer.cpp
)

target_link_libraries(processor PRIVATE nlohmann_json::nlohmann_json)

# Tests
enable_testing()
add_executable(processor_tests tests/test_parser.cpp src/csv_parser.cpp src/json_writer.cpp)
target_link_libraries(processor_tests PRIVATE nlohmann_json::nlohmann_json)
add_test(NAME ProcessorTests COMMAND processor_tests)
```

## 7.4 CSV Parser

### `src/csv_parser.h`

```cpp
#pragma once

#include <string>
#include <vector>

namespace flowforge {

struct CsvData {
    std::vector<std::string> headers;
    std::vector<std::vector<std::string>> rows;
};

class CsvParser {
public:
    CsvData parse(const std::string& filepath);
    CsvData parseString(const std::string& content);

private:
    std::vector<std::string> parseLine(const std::string& line);
};

} // namespace flowforge
```

### `src/csv_parser.cpp`

```cpp
#include "csv_parser.h"
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace flowforge {

CsvData CsvParser::parse(const std::string& filepath) {
    std::ifstream file(filepath);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open file: " + filepath);
    }

    std::string content((std::istreambuf_iterator<char>(file)),
                         std::istreambuf_iterator<char>());
    return parseString(content);
}

CsvData CsvParser::parseString(const std::string& content) {
    CsvData data;
    std::istringstream stream(content);
    std::string line;

    // Parse header
    if (std::getline(stream, line)) {
        // Remove trailing \r if present
        if (!line.empty() && line.back() == '\r') line.pop_back();
        data.headers = parseLine(line);
    }

    // Parse rows
    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        if (line.empty()) continue;
        data.rows.push_back(parseLine(line));
    }

    return data;
}

std::vector<std::string> CsvParser::parseLine(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool inQuotes = false;

    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];

        if (c == '"') {
            if (inQuotes && i + 1 < line.size() && line[i + 1] == '"') {
                field += '"';
                ++i;  // Skip escaped quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (c == ',' && !inQuotes) {
            fields.push_back(field);
            field.clear();
        } else {
            field += c;
        }
    }
    fields.push_back(field);

    return fields;
}

} // namespace flowforge
```

## 7.5 JSON Writer

### `src/json_writer.h`

```cpp
#pragma once

#include "csv_parser.h"
#include <string>

namespace flowforge {

class JsonWriter {
public:
    void write(const CsvData& data, const std::string& outputPath);
    std::string toString(const CsvData& data);
};

} // namespace flowforge
```

### `src/json_writer.cpp`

```cpp
#include "json_writer.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <stdexcept>

namespace flowforge {

void JsonWriter::write(const CsvData& data, const std::string& outputPath) {
    std::ofstream file(outputPath);
    if (!file.is_open()) {
        throw std::runtime_error("Cannot open output file: " + outputPath);
    }
    file << toString(data);
}

std::string JsonWriter::toString(const CsvData& data) {
    nlohmann::json jsonArray = nlohmann::json::array();

    for (const auto& row : data.rows) {
        nlohmann::json obj = nlohmann::json::object();
        for (size_t i = 0; i < data.headers.size() && i < row.size(); ++i) {
            obj[data.headers[i]] = row[i];
        }
        jsonArray.push_back(obj);
    }

    return jsonArray.dump(2);  // Pretty print with 2 spaces
}

} // namespace flowforge
```

## 7.6 Main Entry Point

### `src/main.cpp`

```cpp
#include "csv_parser.h"
#include "json_writer.h"
#include <iostream>
#include <chrono>

int main(int argc, char* argv[]) {
    if (argc != 3) {
        std::cerr << "Usage: " << argv[0] << " <input.csv> <output.json>" << std::endl;
        return 1;
    }

    std::string inputPath = argv[1];
    std::string outputPath = argv[2];

    try {
        auto start = std::chrono::high_resolution_clock::now();

        flowforge::CsvParser parser;
        flowforge::CsvData data = parser.parse(inputPath);

        flowforge::JsonWriter writer;
        writer.write(data, outputPath);

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        std::cout << "Processed " << data.rows.size() << " rows in "
                  << duration.count() << "ms" << std::endl;

        return 0;

    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
}
```

## 7.7 Building

```bash
cd packages/cpp-processor
mkdir build && cd build
cmake ..
cmake --build .
```

## 7.8 Dockerfile

### `packages/cpp-processor/Dockerfile`

```dockerfile
FROM gcc:13 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y cmake
COPY . .
RUN mkdir build && cd build && cmake .. && cmake --build .

FROM alpine:3.19 AS runtime
COPY --from=build /app/build/processor /app/processor
ENTRYPOINT ["/app/processor"]
```

---

# 8. Frontend (React + TypeScript + Vite)

## 8.1 Create the Project

```bash
cd apps/frontend
npm create vite@latest . -- --template react-ts
npm install
npm install @tanstack/react-query react-router-dom reactflow tailwindcss postcss autoprefixer axios
npm install -D @types/react @types/react-dom
npx tailwindcss init -p
```

## 8.2 Project Structure

```text
apps/frontend/
├── src/
│   ├── api/
│   │   ├── client.ts
│   │   ├── workflows.ts
│   │   └── executions.ts
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── WorkflowList.tsx
│   │   ├── WorkflowEditor.tsx
│   │   ├── WorkflowCanvas.tsx
│   │   ├── StepNode.tsx
│   │   ├── ExecutionList.tsx
│   │   ├── ExecutionDetail.tsx
│   │   └── LogViewer.tsx
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── WorkflowsPage.tsx
│   │   ├── WorkflowDetailPage.tsx
│   │   ├── WorkflowEditorPage.tsx
│   │   └── ExecutionsPage.tsx
│   ├── hooks/
│   │   ├── useWorkflows.ts
│   │   └── useExecutions.ts
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── package.json
```

## 8.3 Types

### `src/types/index.ts`

```typescript
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStep[];
  edges: WorkflowEdge[];
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface WorkflowEdge {
  id: string;
  sourceStepId: string;
  targetStepId: string;
}

export type StepType = 'http_request' | 'db_query' | 'transform_json' | 'csv_process';

export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  startedAt?: string;
  finishedAt?: string;
  errorMessage?: string;
  createdAt: string;
  steps: StepExecution[];
  logs: ExecutionLog[];
}

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface StepExecution {
  id: string;
  stepId: string;
  status: ExecutionStatus;
  output?: unknown;
  errorMessage?: string;
  retryCount: number;
}

export interface ExecutionLog {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  steps: CreateStepRequest[];
  edges: CreateEdgeRequest[];
  trigger?: CreateTriggerRequest;
}

export interface CreateStepRequest {
  tempId: string;
  name: string;
  type: StepType;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
}

export interface CreateEdgeRequest {
  sourceTempId: string;
  targetTempId: string;
}

export interface CreateTriggerRequest {
  type: 'manual' | 'cron' | 'webhook';
  config: Record<string, unknown>;
}
```

## 8.4 API Client

### `src/api/client.ts`

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
```

### `src/api/workflows.ts`

```typescript
import apiClient from './client';
import { Workflow, CreateWorkflowRequest } from '../types';

export const workflowsApi = {
  getAll: async (): Promise<Workflow[]> => {
    const { data } = await apiClient.get('/workflows');
    return data;
  },

  getById: async (id: string): Promise<Workflow> => {
    const { data } = await apiClient.get(`/workflows/${id}`);
    return data;
  },

  create: async (request: CreateWorkflowRequest): Promise<Workflow> => {
    const { data } = await apiClient.post('/workflows', request);
    return data;
  },

  update: async (id: string, request: CreateWorkflowRequest): Promise<Workflow> => {
    const { data } = await apiClient.put(`/workflows/${id}`, request);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/workflows/${id}`);
  },

  run: async (id: string): Promise<{ id: string }> => {
    const { data } = await apiClient.post(`/workflows/${id}/run`);
    return data;
  },
};
```

### `src/api/executions.ts`

```typescript
import apiClient from './client';
import { Execution } from '../types';

export const executionsApi = {
  getAll: async (): Promise<Execution[]> => {
    const { data } = await apiClient.get('/executions');
    return data;
  },

  getById: async (id: string): Promise<Execution> => {
    const { data } = await apiClient.get(`/executions/${id}`);
    return data;
  },

  getByWorkflowId: async (workflowId: string): Promise<Execution[]> => {
    const { data } = await apiClient.get(`/workflows/${workflowId}/executions`);
    return data;
  },
};
```

## 8.5 Hooks

### `src/hooks/useWorkflows.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsApi } from '../api/workflows';
import { CreateWorkflowRequest } from '../types';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: workflowsApi.getAll,
  });
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn: () => workflowsApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateWorkflowRequest) => workflowsApi.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateWorkflowRequest) => workflowsApi.update(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflows', id] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workflows'] }),
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.run(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['executions'] }),
  });
}
```

### `src/hooks/useExecutions.ts`

```typescript
import { useQuery } from '@tanstack/react-query';
import { executionsApi } from '../api/executions';

export function useExecutions() {
  return useQuery({
    queryKey: ['executions'],
    queryFn: executionsApi.getAll,
    refetchInterval: 5000,  // Poll every 5 seconds for status updates
  });
}

export function useExecution(id: string) {
  return useQuery({
    queryKey: ['executions', id],
    queryFn: () => executionsApi.getById(id),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Stop polling when execution is complete
      return status === 'success' || status === 'failed' ? false : 2000;
    },
  });
}
```

## 8.6 App Setup

### `src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import WorkflowsPage from './pages/WorkflowsPage';
import WorkflowEditorPage from './pages/WorkflowEditorPage';
import WorkflowDetailPage from './pages/WorkflowDetailPage';
import ExecutionsPage from './pages/ExecutionsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/workflows/new" element={<WorkflowEditorPage />} />
            <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
            <Route path="/workflows/:id/edit" element={<WorkflowEditorPage />} />
            <Route path="/executions" element={<ExecutionsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
```

## 8.7 Tailwind Configuration

### `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### `src/index.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## 8.8 Vite Configuration

### `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

---

# 9. CI/CD Pipeline

## 9.1 GitHub Actions

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  api:
    name: Build & Test API
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '8.0.x'
      - run: dotnet restore
        working-directory: apps/api/FlowForge.Api
      - run: dotnet build --no-restore
        working-directory: apps/api/FlowForge.Api
      - run: dotnet test --no-build
        working-directory: apps/api/FlowForge.Api

  worker:
    name: Build & Test Worker
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: '21'
          distribution: 'temurin'
      - run: mvn verify
        working-directory: apps/worker

  cpp-processor:
    name: Build & Test Processor
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          sudo apt-get update
          sudo apt-get install -y cmake g++
      - run: |
          mkdir build && cd build
          cmake ..
          cmake --build .
          ctest --output-on-failure
        working-directory: packages/cpp-processor

  frontend:
    name: Build Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
        working-directory: apps/frontend
      - run: npm run build
        working-directory: apps/frontend
      - run: npm run lint
        working-directory: apps/frontend
```

---

# 10. Step-by-Step Build Order

Follow this exact order when building the project from scratch:

## Phase 1: Foundation (Days 1-2)

1. Create repository structure (all folders)
2. Write `docker-compose.yml`
3. Start PostgreSQL and RabbitMQ
4. Create database schema (`001-schema.sql`)
5. Verify database tables exist

## Phase 2: Backend API (Days 3-5)

1. Create .NET project with `dotnet new webapi`
2. Add NuGet packages
3. Create models (all entity classes)
4. Create `FlowForgeDbContext`
5. Create DTOs
6. Create `WorkflowService`
7. Create `WorkflowsController`
8. Test CRUD with Swagger UI
9. Create `RabbitMqPublisher`
10. Create `ExecutionService`
11. Create `ExecutionsController`
12. Test run endpoint (verify message appears in RabbitMQ management UI)

## Phase 3: Worker (Days 6-9)

1. Create Spring Boot project
2. Add Maven dependencies
3. Create JPA entities
4. Create `RabbitMqConfig`
5. Create `ExecutionListener`
6. Test message consumption (print to console)
7. Create repositories
8. Create `LogService`
9. Create `StepExecutor` (start with `http_request` only)
10. Create `WorkflowEngine` (topological sort + sequential execution)
11. Test end-to-end: create workflow → run → verify execution record updated

## Phase 4: C++ Processor (Days 10-11)

1. Create CMake project
2. Implement `CsvParser`
3. Implement `JsonWriter`
4. Implement `main.cpp`
5. Test with sample CSV files
6. Integrate with Java worker's `CsvProcessStep`

## Phase 5: Frontend (Days 12-15)

1. Create Vite project
2. Install dependencies
3. Set up Tailwind CSS
4. Create API client and hooks
5. Build `WorkflowsPage` (list view)
6. Build `WorkflowEditorPage` (React Flow canvas)
7. Build execution trigger (Run button)
8. Build `ExecutionsPage` (list with status)
9. Build `ExecutionDetail` (logs + step statuses)
10. Add polling for live status updates

## Phase 6: Integration (Days 16-17)

1. Test full flow end-to-end
2. Add error handling edge cases
3. Write Dockerfiles for all services
4. Test with `docker-compose up` (full stack)

## Phase 7: Polish (Days 18-20)

1. Add CI pipeline
2. Add request validation (FluentValidation)
3. Add retry logic (Resilience4j)
4. Add proper logging
5. Write README with setup instructions

---

# 11. Testing Each Component

## 11.1 Backend API Tests

```bash
# Start infra
cd infra && docker-compose up -d

# Run API
cd apps/api/FlowForge.Api && dotnet run

# Test health
curl http://localhost:5000/api/health

# Create workflow
curl -X POST http://localhost:5000/api/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "A test",
    "steps": [
      {"tempId": "s1", "name": "Fetch Data", "type": "http_request", "config": {"url": "https://jsonplaceholder.typicode.com/todos/1", "method": "GET"}, "positionX": 100, "positionY": 100},
      {"tempId": "s2", "name": "Transform", "type": "transform_json", "config": {"expression": "$.title"}, "positionX": 300, "positionY": 100}
    ],
    "edges": [
      {"sourceTempId": "s1", "targetTempId": "s2"}
    ]
  }'

# List workflows
curl http://localhost:5000/api/workflows

# Run workflow (replace {id} with actual ID)
curl -X POST http://localhost:5000/api/workflows/{id}/run
```

## 11.2 Worker Tests

```bash
# Run worker
cd apps/worker && mvn spring-boot:run

# Trigger via API (worker should pick up the message)
# Then check execution status
curl http://localhost:5000/api/executions
```

## 11.3 C++ Processor Tests

```bash
# Create test CSV
echo "name,age,city" > test.csv
echo "Alice,30,NYC" >> test.csv
echo "Bob,25,LA" >> test.csv

# Run processor
cd packages/cpp-processor/build
./processor ../../test.csv output.json
cat output.json
```

Expected output:
```json
[
  {"name": "Alice", "age": "30", "city": "NYC"},
  {"name": "Bob", "age": "25", "city": "LA"}
]
```

---

# 12. Configuration Reference

## 12.1 Environment Variables

### API

| Variable | Default | Description |
|----------|---------|-------------|
| `ConnectionStrings__DefaultConnection` | (see appsettings) | PostgreSQL connection string |
| `RabbitMQ__Host` | localhost | RabbitMQ host |
| `RabbitMQ__Port` | 5672 | RabbitMQ port |
| `RabbitMQ__Username` | guest | RabbitMQ username |
| `RabbitMQ__Password` | guest | RabbitMQ password |
| `ASPNETCORE_ENVIRONMENT` | Development | Runtime environment |

### Worker

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | jdbc:postgresql://localhost:5432/flowforge | DB URL |
| `SPRING_DATASOURCE_USERNAME` | flowforge | DB username |
| `SPRING_DATASOURCE_PASSWORD` | flowforge_dev | DB password |
| `SPRING_RABBITMQ_HOST` | localhost | RabbitMQ host |
| `SPRING_RABBITMQ_USERNAME` | flowforge | RabbitMQ username |
| `SPRING_RABBITMQ_PASSWORD` | flowforge_dev | RabbitMQ password |
| `FLOWFORGE_PROCESSOR_PATH` | /opt/flowforge/processor | Path to C++ binary |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | http://localhost:5000/api | Backend API URL |

---

# 13. RabbitMQ Message Contract

## Exchange and Queue Setup

- **Exchange**: `flowforge.executions` (type: direct, durable: true)
- **Queue**: `flowforge.executions.queue` (durable: true)
- **Routing Key**: `execution.start`

## Message Format

```json
{
  "executionId": "uuid",
  "workflowId": "uuid",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

The message is published by the C# API when a user triggers a workflow run. The Java worker consumes the message and begins execution.

---

# 14. Error Handling Strategy

## API Level
- Input validation via FluentValidation (400 Bad Request)
- Resource not found returns 404
- Unhandled exceptions return 500 with generic message
- All exceptions logged server-side

## Worker Level
- Step failures are caught and recorded per-step
- Failed step marks entire execution as failed
- Retry logic: up to 3 attempts per step (configurable)
- Dead letter queue for permanently failed messages (future)

## C++ Processor Level
- Exit code 0 = success
- Exit code 1 = error (message written to stderr)
- Java worker reads stderr on failure for error details

---

# 15. Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Cannot connect to PostgreSQL | Docker not running | `docker-compose up -d` |
| RabbitMQ connection refused | Container not ready | Wait for healthcheck or restart |
| Worker doesn't receive messages | Exchange/queue mismatch | Verify names in both API and Worker configs |
| CORS errors in browser | API not configured | Check CORS policy in Program.cs |
| EF Core migration errors | Schema drift | Re-run init SQL or add migrations |
| C++ processor not found | Wrong path | Set `FLOWFORGE_PROCESSOR_PATH` correctly |
| Frontend can't reach API | Wrong URL or proxy | Check `vite.config.ts` proxy or `VITE_API_URL` |

---

# 16. Prerequisites Checklist

Before starting, ensure you have installed:

- [ ] Docker Desktop (with Docker Compose)
- [ ] .NET 8 SDK
- [ ] Java 21 (e.g., Eclipse Temurin)
- [ ] Maven 3.9+
- [ ] Node.js 20+ with npm
- [ ] C++ compiler (g++ 12+ or MSVC 2022)
- [ ] CMake 3.16+
- [ ] Git
- [ ] A code editor (VS Code recommended)
- [ ] (Optional) pgAdmin or DBeaver for database inspection
- [ ] (Optional) Postman or curl for API testing
