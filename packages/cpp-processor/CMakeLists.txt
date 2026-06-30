cmake_minimum_required(VERSION 3.16)
project(flowforge-processor VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Download nlohman/json if not already present
include(FetchContent)
FetchContent_Declare(json
    URL  https://github.com/nlohmann/json/releases/download/v3.11.3/json.tar.xz
)
FetchContent_MakeAvailable(json)

add_executable(processor
    src/main.cpp
    src/csv_parser.cpp
    src/json_writer.cpp
)

target_link_libraries(processor PRIVATE nlohmann_json::nlohmann_json)

# Test
enable_testing()
add_executable(processor_test tests/test_parser.cpp src/csv_parser.cpp src/json_writer.cpp)
target_link_libraries(processor_test PRIVATE nlohmann_json::nlohmann_json)
add_test(NAME ProcessorTests COMMAND processor_test)