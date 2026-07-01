package com.flowforge.worker.model;

import java.util.UUID;

public record ExecutionMessage(
    UUID executionId,
    UUID workflowId,
    String timestamp
) {}