#include "json_writer.h"
#include <nlohmann/json.hpp>
#include <fstream>
#include <stdexcept>


using std::runtime_error;
using std::string;
using std::vector;

namespace flowforge {
    
    void JsonWriter::write(const CsvData& data, const string& outputPath) {
        std::ofstream file(outputPath);
        if (!file.is_open()) {
            throw runtime_error("Could not open file for writing: " + outputPath);
        }
        file << toString(data);
    }

    string JsonWriter::toString(const CsvData& data) {
        nlohmann::json jsonData = nlohmann::json::array();

        for (const auto& row : data.rows) {
            nlohmann::json jsonRow;
            for (size_t i = 0; i < data.headers.size(); ++i) {
                if (i < row.size()) {
                    jsonRow[data.headers[i]] = row[i];
                } else {
                    jsonRow[data.headers[i]] = nullptr; // Handle missing values
                }
            }
            jsonData.push_back(jsonRow);
        }

        return jsonData.dump(2); // Pretty print with 2 spaces indentation
    }

}
