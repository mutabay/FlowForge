package com.flowforge.worker.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.DefaultClassMapper;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class RabbitConfig {
    public static final String EXECUTION_QUEUE = "flowforge.executions.queue";
    public static final String EXECUTION_EXCHANGE = "flowforge.executions";
    public static final String EXECUTION_ROUTING_KEY = "execution.start";

    @Bean
    public Queue executionQueue() {
        return new Queue(EXECUTION_QUEUE, true);
    }

    @Bean
    public TopicExchange executionExchange() {
        return new TopicExchange(EXECUTION_EXCHANGE);
    }

    @Bean
    public Binding executionBinding(Queue executionQueue, TopicExchange executionExchange) {
        return BindingBuilder.bind(executionQueue).to(executionExchange).with(EXECUTION_ROUTING_KEY);
    }

    @Bean
    public MessageConverter jsonMessageConverter() {
        Jackson2JsonMessageConverter converter = new Jackson2JsonMessageConverter();
        // Don't require __TypeId__ header from non-Java publishers
        converter.setAlwaysConvertToInferredType(true);
        DefaultClassMapper classMapper = new DefaultClassMapper();
        classMapper.setDefaultType(com.flowforge.worker.model.ExecutionMessage.class);
        converter.setClassMapper(classMapper);
        return converter;
    }
}
