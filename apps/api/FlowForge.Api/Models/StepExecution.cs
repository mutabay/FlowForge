namespace FlowForge.Api.Models;


public class StepExecution
{
    public Guid Id { get; set; }
    public Guid WorkflowExecutionId { get; set; }
    public Guid StepId { get; set; }
    public string Status { get; set; } = "pending";
    public string? Input { get; set; }
    public string? Output { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public int RetryCount { get; set; } = 0;

    public WorkflowExecution WorkflowExecution { get; set; } = null!;
    public WorkflowStep Step { get; set; } = null!;
}