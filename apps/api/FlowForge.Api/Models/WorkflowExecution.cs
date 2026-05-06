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
