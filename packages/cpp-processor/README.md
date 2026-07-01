# FlowForge C++ Processor

![C++](https://img.shields.io/badge/C%2B%2B17-00599C?style=flat&logo=cplusplus&logoColor=white)
![CMake](https://img.shields.io/badge/CMake-064F8C?style=flat&logo=cmake&logoColor=white)

**A command-line tool that transforms CSV files into structured JSON. Called by the Java Worker as a subprocess during workflow execution.**

---

## Usage

```bash
./processor <input.csv> <output.json>
```

**Exit codes:**

| Code | Meaning |
|------|---------|
| `0` | Success — JSON written to output file |
| `1` | Error — details written to stderr |

---

## Example

```
$ cat input.csv
name,age,city
Alice,30,New York
Bob,25,Berlin

$ ./processor input.csv output.json
Processed 2 rows in 0ms

$ cat output.json
[
  { "name": "Alice", "age": "30", "city": "New York" },
  { "name": "Bob", "age": "25", "city": "Berlin" }
]
```

---

## CSV Parser Behavior

- First row treated as column headers
- Handles quoted fields: `"value, with comma"`
- Handles escaped quotes: `"She said ""hello"""`
- Handles both `\r\n` and `\n` line endings
- Skips empty lines
- RFC 4180 compliant

---

## Building

### Prerequisites

- CMake 3.16+
- C++17 compiler (GCC 9+, Clang 10+, MSVC 2019+)

### Compile

```bash
cd packages/cpp-processor
mkdir build && cd build
cmake ..
cmake --build .
```

Output: `build/processor`

### Run Tests

```bash
cd build
ctest --output-on-failure
```

---

## How the Worker Calls It

The Java Worker invokes the processor via `ProcessBuilder`:

```java
ProcessBuilder pb = new ProcessBuilder(processorPath, inputFile, outputFile);
Process process = pb.start();
int exitCode = process.waitFor();
// exitCode 0 → read outputFile
// exitCode 1 → read stderr for error message
```

Temporary files are created before invocation and cleaned up in a `finally` block.

---

## Dependencies

| Library | Version | Source |
|---------|---------|--------|
| [nlohmann/json](https://github.com/nlohmann/json) | 3.11.3 | Fetched automatically via CMake `FetchContent` |

No manual dependency installation required.

---

## Project Structure

```
packages/cpp-processor/
├── src/
│   ├── main.cpp          # Entry point, argument parsing, timing
│   ├── csv_parser.h      # CsvParser class interface
│   ├── csv_parser.cpp    # Parsing logic (handles quotes, escapes)
│   ├── json_writer.h     # JsonWriter class interface
│   └── json_writer.cpp   # JSON output via nlohmann/json
├── tests/
│   └── test_parser.cpp   # Unit tests
├── CMakeLists.txt        # Build configuration + FetchContent
└── Dockerfile            # Multi-stage build (GCC → Alpine)
```

---

## Docker

```bash
docker build -t flowforge-processor .
```

Multi-stage: compiles with GCC 13, outputs a minimal Alpine image containing only the binary.
