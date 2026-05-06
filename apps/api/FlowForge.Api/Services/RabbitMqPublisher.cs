using System.Text;
using System.Text.Json;
using RabbitMQ.Client;
using FlowForge.Api.Configuration;
using Microsoft.Extensions.Options;

namespace FlowForge.Api.Services;
// Make it signleton and dispose connection when app shuts down
public class RabbitMqPublisher : IRabbitMqPublisher, IDisposable
{
    private readonly IConnection _connection;
    private readonly IModel _channel;
    private readonly RabbitMqSettings _settings;

    public RabbitMqPublisher(IOptions<RabbitMqSettings> options)
    {
        _settings = options.Value;

        var factory = new ConnectionFactory()
        {
            HostName = _settings.HostName,
            Port = _settings.Port,
            UserName = _settings.UserName,
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
        var message = new { ExecutionId = executionId, WorkflowId = workflowId, Timestamp = DateTime.UtcNow};
        
        var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));

        var properties = _channel.CreateBasicProperties();
        properties.Persistent = true;
        properties.ContentType = "application/json";

        _channel.BasicPublish(exchange: _settings.ExchangeName, routingKey: _settings.RoutingKey, 
        basicProperties: properties, body: body);
        
        return Task.CompletedTask;
    }

    private bool _disposed;
    public void Dispose()
    {
        if (_disposed) return;

        _channel?.Dispose();
        _connection?.Dispose();

        _disposed = true;

        GC.SuppressFinalize(this);
    }
}