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
    public string TempId { get; init; } = string.Empty; // Client-side ID for edge mapping
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