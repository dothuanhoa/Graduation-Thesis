package com.discoveryserver;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.cloud.netflix.eureka.server.EnableEurekaServer;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DiscoveryServerApplicationTests {

    @Test
    void contextLoads() {
    }

    @Test
    void applicationIsConfiguredAsEurekaServer() {
        assertThat(DiscoveryServerApplication.class.isAnnotationPresent(EnableEurekaServer.class)).isTrue();
    }
}