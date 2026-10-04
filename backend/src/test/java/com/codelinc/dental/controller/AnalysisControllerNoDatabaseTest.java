package com.codelinc.dental.controller;

import com.codelinc.dental.exception.DatabaseUnavailableException;
import com.codelinc.dental.service.AnalysisService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code POST /api/analyze} when the backend runs without the database: a 503 whose message the
 * front end shows, never a generic 500.
 */
@WebMvcTest(AnalysisController.class)
@ActiveProfiles("test")
class AnalysisControllerNoDatabaseTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalysisService analysisService;

    @Test
    void answers503WithHowToEnableTheDatabase() throws Exception {
        when(analysisService.analyze(anyString(), anyString()))
                .thenThrow(new DatabaseUnavailableException("Cost estimates need the database. Start the backend with the db profile."));

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\",\"message\":\"how much is a crown?\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.message").value(containsString("db profile")));
    }
}
