package com.codelinc.dental.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code GET /api/members} without a database (no {@code db} profile, so no member directory): it
 * answers 503 with a message the front end can show, instead of the app failing to start.
 */
@WebMvcTest(MemberController.class)
@ActiveProfiles("test")
@Import(MemberControllerWithoutDatabaseTest.SystemClock.class)
class MemberControllerWithoutDatabaseTest {

    @TestConfiguration
    static class SystemClock {
        @Bean
        Clock clock() {
            return Clock.systemUTC();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void answers503WhenThereIsNoDatabase() throws Exception {
        mockMvc.perform(get("/api/members"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value(containsString("db profile")));
    }
}
