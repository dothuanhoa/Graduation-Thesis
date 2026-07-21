package com.authservice.service;

import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {
    private static final String TEST_JWT_SECRET = "bXktdGVzdC1qd3Qtc2VjcmV0LW15LXRlc3Qtand0LXNlY3JldA==";

    private final JwtService jwtService = new JwtService(TEST_JWT_SECRET, 15);

    @Test
    void generatedAccessTokenCanBeParsedFromBearerHeader() {
        String token = jwtService.generateAccessToken("DH52201258", "STUDENT");

        String username = jwtService.extractUsernameFromBearer("Bearer " + token);

        assertThat(username).isEqualTo("DH52201258");
    }

    @Test
    void rejectsMissingBearerPrefix() {
        assertThatThrownBy(() -> jwtService.extractUsernameFromBearer("bad-token"))
                .isInstanceOf(ResponseStatusException.class);
    }
}
