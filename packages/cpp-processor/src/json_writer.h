#pragma once

#include "csv_parser.h"
#include <string>

namespace flowforge {

class JsonWriter {
public:
    void write(const CsvData& data, const std::string& outputPath);
    std::string toString(const CsvData& data);
};
} // namespace flowforge