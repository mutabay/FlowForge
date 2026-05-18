package com.flowforge.worker.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Configuration
public class RabbitConfig {
    public static final String EXECUTION_QUEUE = "execution_queue";
    public static final String EXECUTION_EXCHANGE = "execution_exchange";
    public static final String EXECUTION_ROUTING_KEY = "execution_routing_key";

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

}
