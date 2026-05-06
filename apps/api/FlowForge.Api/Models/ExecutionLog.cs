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

    public WorkflowExecution WorkflowExecution { get; set; } = null!;
}