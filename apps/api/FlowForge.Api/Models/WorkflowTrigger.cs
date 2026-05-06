namespace FlowForge.Api.Models;

public class WorkflowTrigger
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Config { get; set; } = "{}";
    public DateTime CreatedAt { get; set; }

    public Workflow Workflow { get; set; } = null!;
}