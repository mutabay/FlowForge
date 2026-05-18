package com.flowforge.worker.model;

import java.time.Instant;
import java.util.UUID;

public record ExecutionMessage(
    UUID executionId,
    UUID workflowId,
    Instant timestamp
) {}