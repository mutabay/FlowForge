#include "csv_parser.h"
#include <fstream>
#include <sstream>
#include <stdexcept>

using std::runtime_error;
using std::string;
using std::vector;

namespace flowforge
{

    CsvData CsvParser::parse(const string &filepath)
    {
        std::ifstream file(filepath);
        if (!file.is_open())
        {
            throw runtime_error("Could not open file: " + filepath);
        }

        string content((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
        return parseString(content);
    }

    CsvData CsvParser::parseString(const string& content)
    {
        CsvData data;
        std::istringstream stream(content);
        string line;

        // Parse header
        if (std::getline(stream, line))
        {   // Remove trailing \r if present
            if (!line.empty() && line.back() == '\r') line.pop_back();
            data.headers = parseLine(line);
        }

        // Parse rows
        while (std::getline(stream, line))
        {
            // Remove trailing \r if present
            if (!line.empty() && line.back() == '\r') line.pop_back();
            if (line.empty()) continue; // Skip empty lines
            data.rows.push_back(parseLine(line));
        }

        return data;

    }


    vector<string> CsvParser::parseLine(const string& line)
    {
        vector<string> fields;
        string field;
        bool inQuotes = false;

        for (size_t i = 0; i < line.size(); ++i)
        {
            char c = line[i];

            if (c == '"')
            {
                if (inQuotes && i + 1 < line.size() && line[i + 1] == '"')
                {
                    // Escaped quote
                    field += '"';
                    ++i; // Skip the next quote
                }
                else
                    inQuotes = !inQuotes; // Toggle inQuotes state
                
            }
            else if (c == ',' && !inQuotes)
            {
                fields.push_back(field);
                field.clear();
            }
            else
                field += c;
        }
        fields.push_back(field);
        return fields;
    }
} // namespace flowforge