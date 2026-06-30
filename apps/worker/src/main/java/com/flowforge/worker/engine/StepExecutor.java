package com.flowforge.worker.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.worker.model.StepData;

import io.github.resilience4j.retry.annotation.Retry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;


@Component
public class StepExecutor {
    private static final Logger log = LoggerFactory.getLogger(StepExecutor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;

    @Value("${flowforge.processor.path:/opt/flowforge/processor}")
    private String processorPath;

    public StepExecutor() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @Retry(name = "stepExecution", fallbackMethod = "executeFallback")
    public String execute(StepData step, String previousOutput) throws Exception {
        
        JsonNode config = objectMapper.readTree(step.getConfig());

        return switch (step.getType()) {
            case "http_request" -> executeHttpRequest(config, previousOutput);
            case "transform_json" -> executeJsonTransform(config, previousOutput);
            case "csv_process" -> executeCsvProcess(config, previousOutput);
            case "db_query" -> executeDbQuery(config, previousOutput);
            default -> throw new IllegalArgumentException("Unknown step type: " + step.getType());        
        };
    }

    private String executeFallback(StepData step, String previousOutput, Exception e) throws Exception 
    {
        throw new RuntimeException(
            "Step '" + step.getName() + "' failed after retries: " + e.getMessage(), e);
    }

    private String executeHttpRequest(JsonNode config, String previousOutput) throws Exception {
        String method = config.has("method") ? config.get("method").asText() : "GET";
        String url = config.get("url").asText();
        
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(30));
        
        if ("POST".equalsIgnoreCase(method) || "PUT".equalsIgnoreCase(method)) {
            String bodyContent = previousOutput != null ? previousOutput : "";
            String body = config.has("body") ? config.get("body").toString() : bodyContent;
            builder.method(method, HttpRequest.BodyPublishers.ofString(body));
            builder.header("Content-Type", "application/json");
        } else {
            builder.method(method, HttpRequest.BodyPublishers.noBody());
        }
        
        // Add headers from config
        if (config.has("headers")) {
            config.get("headers").fields().forEachRemaining(entry ->
            builder.header(entry.getKey(), entry.getValue().asText()));
        }

        HttpResponse<String> response = httpClient.send(builder.build(),
                HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP request failed with status " + response.statusCode());
        }

        return response.body();
    }       // TODO - Check DELETE

    private String executeJsonTransform(JsonNode config, String previousOutput) throws Exception {
        if (previousOutput == null) {
            throw new RuntimeException("No input data for JSON transform");
        }

        // Simple field extraction / mapping
        String expression = config.has("expression") ? config.get("expression").asText() : null;

        if (expression != null) {
            JsonNode input = objectMapper.readTree(previousOutput);
            // Simple JSONPath-like extraction (e.g., "$.data" or "$.items")
            String[] parts = expression.replace("$.", "").split("\\.");
            JsonNode current = input;
            for (String part : parts) {
                if (current.has(part)) {
                    current = current.get(part);
                } else {
                    throw new RuntimeException("Field not found: " + part);
                }
            }
            return objectMapper.writeValueAsString(current);
        }    
        return previousOutput;
    }

    private String executeCsvProcess(JsonNode config, String previousOutput) throws Exception {
        // Write input to temp file
        Path inputFile = Files.createTempFile("flowforge-input-", ".csv");
        Path outputFile = Files.createTempFile("flowforge-output-", ".json");

        try {
            if (previousOutput != null) {
                Files.writeString(inputFile, previousOutput);
            }
            else if (config.has("input_file")) {
                inputFile = Path.of(config.get("input_file").asText());
            }

            // Call C++ processor
            ProcessBuilder pb = new ProcessBuilder(processorPath, inputFile.toString(), outputFile.toString());
            pb.redirectErrorStream(true);

            Process process = pb.start();
            String processOutput = new String(process.getInputStream().readAllBytes());
            int exitCode = process.waitFor();

            if (exitCode != 0) {
                throw new RuntimeException("CSV processor failed (exit code " + exitCode + "): " + processOutput);
            }
            return Files.readString(outputFile);
        
        } finally {
            Files.deleteIfExists(inputFile);
            Files.deleteIfExists(outputFile);
        }
    }

    private String executeDbQuery(JsonNode config, String previousOutput) throws Exception {
        // This would use a separate DataSource to execute queries
        // For now, return a placeholder
        throw new UnsupportedOperationException("DB query step not yet implemented");
    }

}
