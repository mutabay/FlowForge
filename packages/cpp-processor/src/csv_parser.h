#pragma once 

#include <string>
#include <vector>

namespace flowforge {

struct CsvData {
    std::vector<std::string> headers;
    std::vector<std::vector<std::string>> rows;
};

class CsvParser {
    public:
        CsvData parse(const std::string& filepath);
        CsvData parseString(const std::string& content);
    private:
        std::vector<std::string> parseLine(const std::string& line);
};
}// namespace flowforge