package com.flowforge.worker.engine;

import com.flowforge.worker.model.*;
import com.flowforge.worker.repository.*;
import com.flowforge.worker.service.LogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Service
public class WorkflowEngine {
    private static final Logger log = LoggerFactory.getLogger(WorkflowEngine.class);
    
    private final WorkflowRepository workflowRepo;
    private final ExecutionRepository executionRepo;
    private final StepExecutionRepository stepExecutionRepo;
    private final StepExecutor stepExecutor;
    private final LogService logService;
    
    public WorkflowEngine(WorkflowRepository workflowRepo, 
                          ExecutionRepository executionRepo, 
                          StepExecutionRepository stepExecutionRepo,
                          StepExecutor stepExecutor,
                          LogService logService) {
        this.workflowRepo = workflowRepo;
        this.executionRepo = executionRepo;
        this.stepExecutionRepo = stepExecutionRepo;
        this.stepExecutor = stepExecutor;
        this.logService = logService;
    }

    @Transactional
    public void execute(UUID executionId, UUID workflowId) {
        // Mark execution as running.
        executionRepo.updateStatus(executionId, "running", Instant.now(), null, null);
        logService.log(executionId, null, "info", "Execution started");

        // Load workflow
        WorkflowData workflow = workflowRepo.findById(workflowId)
            .orElseThrow(() -> new RuntimeException("Workflow not found: " + workflowId));
        
        // Build execution order using topological sort
        List<StepData> orderedSteps = topologicalSort(workflow.getSteps(), workflow.getEdges());

        logService.log(executionId, null, "info", "Executing " + orderedSteps.size() + " steps"); 

        String previousOutput = null;

        for (StepData step : orderedSteps) {
            UUID stepExecId = UUID.randomUUID();

            try {
                // Create step execution record
                stepExecutionRepo.insertStepExecution(stepExecId, executionId, step.getId(),
                        "running", previousOutput, Instant.now());

                logService.log(executionId, step.getId(), "info",
                        "Executing step: " + step.getName() + " (type: " + step.getType() + ")");
                    
                // Execute step
                String output = stepExecutor.execute(step, previousOutput);

                // Mark step as success
                stepExecutionRepo.updateStepExecution(stepExecId, "success", output, null, Instant.now());
                logService.log(executionId, step.getId(), "info", "Step completed successfully");
                
                previousOutput = output;
            } catch (Exception e) {
                log.error("Step execution failed: step={}, error={}", step.getName(), e.getMessage());
                stepExecutionRepo.updateStepExecution(stepExecId, "failed", null, e.getMessage(), Instant.now());
                logService.log(executionId, step.getId(), "error",
                        "Step failed: " + e.getMessage());

                // Mark entire execution as failed
                executionRepo.updateStatus(executionId, "failed", null, Instant.now(), e.getMessage());
                logService.log(executionId, null, "error", "Execution failed at step: " + step.getName());
                return;
            }
        }

        // Mark execution as success
        executionRepo.updateStatus(executionId, "success", null, Instant.now(), null);
        logService.log(executionId, null, "info", "Execution completed successfully");
    }

    private List<StepData> topologicalSort(List<StepData> steps, List<EdgeData> edges) {

        /*        
        1. Count how many dependencies each step has (inDegree)
        2. Find all steps with 0 dependencies (can start immediately)
        3. Process those steps in a queue
        4. For each processed step, decrease inDegree of dependent steps
        5. When a step's inDegree becomes 0, add it to the queue
        6. Continue until queue is empty
        */
        Map<UUID, StepData> stepMap = new HashMap<>();
        Map<UUID, List<UUID>> adjacency = new HashMap<>();
        Map<UUID, Integer> inDegree = new HashMap<>();

        for (StepData step : steps) {
            stepMap.put(step.getId(), step);
            adjacency.put(step.getId(), new ArrayList<>());
            inDegree.put(step.getId(), 0);
        }

        for (EdgeData edge : edges) {
            adjacency.get(edge.getSourceStepId()).add(edge.getTargetStepId());
            inDegree.merge(edge.getTargetStepId(), 1, Integer::sum);
        }

        Queue<UUID> queue = new LinkedList<>();
        for (var entry : inDegree.entrySet()) {
            if (entry.getValue() == 0) {
                queue.add(entry.getKey());
            }
        }

        List<StepData> result = new ArrayList<>();
        while (!queue.isEmpty()) {
            UUID current = queue.poll();
            result.add(stepMap.get(current));

            for (UUID neighbor : adjacency.get(current)) {
                inDegree.merge(neighbor, -1, Integer::sum);
                if (inDegree.get(neighbor) == 0) {
                    queue.add(neighbor);
                }
            }
        }

        if (result.size() != steps.size()) {
            throw new RuntimeException("Cycle detected in workflow graph");
        }

        return result;
    }
}
