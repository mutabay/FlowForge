#include "csv_parser.h"
#include "json_writer.h"
#include <iostream>
#include <chrono>

using std::string;
using std::cerr;
using std::cout;
using std::endl;


int main(int argc, char* argv[]) {
    if (argc != 3) {
        cerr << "Usage: " << argv[0] << " <input_csv_file> <output_json_file>" << endl;
        return 1;
    }

    const string inputPath = argv[1];
    const string outputPath = argv[2];

    
    try {
        auto start = std::chrono::high_resolution_clock::now();
        
        flowforge::CsvParser parser;
        flowforge::CsvData data = parser.parse(inputPath);

        flowforge::JsonWriter writer;
        writer.write(data, outputPath);

        auto end = std::chrono::high_resolution_clock::now();
        auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end - start);

        std::cout << "Processed " << data.rows.size() << " rows in "
                  << duration.count() << "ms" << std::endl;

        return 0;

        
    } catch (const std::exception& e) {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }

    return 0;
}