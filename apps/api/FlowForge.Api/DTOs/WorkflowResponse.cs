namespace FlowForge.Api.DTOs;


public record WorkflowResponse
{
    public Guid Id { get; init; }
    public string Name {get; init; } = string.Empty;
    public string? Description { get; init; }
    public bool IsActive { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
    public List<StepResponse> Steps { get; init; } = new();
    public List<EdgeResponse> Edges { get; init; } = new();
};

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

public record WorkflowExecutionResponse
{
    public Guid Id { get; init; }
    public Guid WorkflowId { get; init; }
    public string Status { get; init; } = string.Empty;
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
    public string? ErrorMessage { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<StepExecutionResponse> StepExecutions { get; init; } = new();
    public List<ExecutionLogResponse> Logs { get; init; } = new();
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

public record ExecutionLogResponse
{
    public Guid Id { get; init; }
    public string Level { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
}