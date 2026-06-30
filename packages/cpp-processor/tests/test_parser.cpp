#include "../src/csv_parser.h"

#include <stdexcept>
#include <string>

int main() {
	flowforge::CsvParser parser;

	const std::string csv = "name,age,city\nAlice,30,NYC\nBob,25,LA\n";
	const flowforge::CsvData data = parser.parseString(csv);

	if (data.headers.size() != 3) {
		throw std::runtime_error("Expected 3 headers");
	}

	if (data.rows.size() != 2) {
		throw std::runtime_error("Expected 2 data rows");
	}

	if (data.rows[0][0] != "Alice" || data.rows[1][2] != "LA") {
		throw std::runtime_error("Parsed values do not match expected output");
	}

	return 0;
}
