package com.flowforge.worker.listener;

import com.flowforge.worker.config.RabbitConfig;
import com.flowforge.worker.engine.WorkflowEngine;
import com.flowforge.worker.model.ExecutionMessage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ExecutionListener {
    private static final Logger log = LoggerFactory.getLogger(ExecutionListener.class);
    private final WorkflowEngine engine;

    public ExecutionListener(WorkflowEngine engine) {
        this.engine = engine;
    }

    @RabbitListener(queues = RabbitConfig.EXECUTION_QUEUE)
    public void onMessage(ExecutionMessage message) {
        log.info("Received execution request: executionId={}, workflowId={}",
         message.executionId(), message.workflowId());

        try {
            engine.execute(message.executionId(), message.workflowId());
        } catch (Exception e) {
            log.error("Failed to execute workflow: {}", e.getMessage(), e);
        }
    }
}
