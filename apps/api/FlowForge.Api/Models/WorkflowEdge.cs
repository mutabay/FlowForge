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