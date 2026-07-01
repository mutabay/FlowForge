package com.flowforge.worker.engine;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowforge.worker.model.StepData;

import io.github.resilience4j.retry.annotation.Retry;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.*;
import java.time.Duration;
import java.util.*;


@Component
public class StepExecutor {
    private static final Logger log = LoggerFactory.getLogger(StepExecutor.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient;
    private final DataSource dataSource;

    public StepExecutor(DataSource dataSource) {
        this.dataSource = dataSource;
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
            // Simple JSONPath-like extraction (e.g., "$.data", "$.0.name")
            String[] parts = expression.replace("$.", "").split("\\.");
            JsonNode current = input;
            for (String part : parts) {
                if (current.isArray()) {
                    // Try numeric index for arrays
                    try {
                        int idx = Integer.parseInt(part);
                        if (idx < current.size()) {
                            current = current.get(idx);
                        } else {
                            throw new RuntimeException("Array index out of bounds: " + part);
                        }
                    } catch (NumberFormatException e) {
                        throw new RuntimeException("Expected numeric index for array, got: " + part);
                    }
                } else if (current.has(part)) {
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
        if (previousOutput == null) {
            throw new RuntimeException("No input data for CSV process");
        }

        // Pure Java CSV-to-JSON conversion (no C++ binary needed)
        String[] lines = previousOutput.strip().split("\n");
        if (lines.length < 2) {
            return "[]";
        }

        String[] headers = lines[0].split(",");
        for (int i = 0; i < headers.length; i++) {
            headers[i] = headers[i].trim().replace("\"", "");
        }

        List<Map<String, String>> rows = new ArrayList<>();
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;
            String[] values = line.split(",");
            Map<String, String> row = new LinkedHashMap<>();
            for (int j = 0; j < headers.length; j++) {
                String val = j < values.length ? values[j].trim().replace("\"", "") : "";
                row.put(headers[j], val);
            }
            rows.add(row);
        }
        return objectMapper.writeValueAsString(rows);
    }

    private String executeDbQuery(JsonNode config, String previousOutput) throws Exception {
        if (!config.has("query")) {
            throw new RuntimeException("DB query step requires a 'query' config field");
        }
        String query = config.get("query").asText();

        // Only allow SELECT for safety
        if (!query.trim().toUpperCase().startsWith("SELECT")) {
            throw new RuntimeException("Only SELECT queries are allowed");
        }

        try (Connection conn = dataSource.getConnection();
             PreparedStatement stmt = conn.prepareStatement(query)) {

            // Bind previous output to any ? parameters in the query
            long paramCount = query.chars().filter(c -> c == '?').count();
            if (paramCount > 0 && previousOutput != null) {
                // Strip JSON quotes if it's a simple string value
                String paramValue = previousOutput.trim();
                if (paramValue.startsWith("\"") && paramValue.endsWith("\"")) {
                    paramValue = objectMapper.readValue(paramValue, String.class);
                }
                for (int i = 1; i <= paramCount; i++) {
                    stmt.setString(i, paramValue);
                }
            }

            ResultSet rs = stmt.executeQuery();

            ResultSetMetaData meta = rs.getMetaData();
            int colCount = meta.getColumnCount();
            List<Map<String, Object>> results = new ArrayList<>();

            while (rs.next()) {
                Map<String, Object> row = new LinkedHashMap<>();
                for (int i = 1; i <= colCount; i++) {
                    row.put(meta.getColumnLabel(i), rs.getObject(i));
                }
                results.add(row);
            }
            return objectMapper.writeValueAsString(results);
        }
    }

}
