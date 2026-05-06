namespace FlowForge.Api.Services;

public interface IRabbitMqPublisher
{
    Task PublishExecutionMessage(Guid executionId, Guid workflowId);
}