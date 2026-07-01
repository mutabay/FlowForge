package com.flowforge.worker;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Disabled;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
@Disabled("Integration test — requires PostgreSQL and RabbitMQ infrastructure")
class WorkerApplicationTests {

	@Test
	void contextLoads() {
	}

}
