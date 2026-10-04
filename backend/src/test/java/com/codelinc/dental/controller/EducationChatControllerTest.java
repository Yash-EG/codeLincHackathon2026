package com.codelinc.dental.controller;

import com.codelinc.dental.dto.education.EducationChatResponse;
import com.codelinc.dental.service.education.EducationChatService;
import com.codelinc.dental.service.education.EducationIntent;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Slice test for {@link EducationChatController}. The service is mocked, so no
 * glossary/model/AWS wiring is exercised here — just the HTTP contract and
 * request validation.
 */
@WebMvcTest(EducationChatController.class)
@ActiveProfiles("test")
class EducationChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EducationChatService service;

    @Test
    void returnsAnswerForValidQuestion() throws Exception {
        when(service.answer(anyString(), any())).thenReturn(new EducationChatResponse(
                EducationIntent.GENERAL_DEFINITION,
                "In general: A deductible is the amount you may need to pay ...",
                null,
                false,
                List.of("deductible"),
                false));

        mockMvc.perform(post("/api/education/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"What is a deductible?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent").value("GENERAL_DEFINITION"))
                .andExpect(jsonPath("$.answer").exists())
                .andExpect(jsonPath("$.estimateHandoff").value(false))
                .andExpect(jsonPath("$.termsUsed[0]").value("deductible"));
    }

    @Test
    void estimateQuestionReturnsHandoffFlag() throws Exception {
        when(service.answer(anyString(), any())).thenReturn(new EducationChatResponse(
                EducationIntent.ESTIMATE_REQUEST,
                "I'll hand this to the cost-estimate tool.",
                null,
                true,
                List.of(),
                false));

        mockMvc.perform(post("/api/education/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"How much will a crown cost me?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.intent").value("ESTIMATE_REQUEST"))
                .andExpect(jsonPath("$.estimateHandoff").value(true));
    }

    @Test
    void blankMessageIsRejectedWith400() throws Exception {
        mockMvc.perform(post("/api/education/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void passesTheCheckedInMemberToTheService() throws Exception {
        when(service.answer(anyString(), any())).thenReturn(new EducationChatResponse(
                EducationIntent.PERSONAL_PLAN_QUESTION, "Your deductible is met.", true, false, List.of("deductible"), false));

        mockMvc.perform(post("/api/education/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Have I met my deductible?\",\"memberId\":\"5\"}"))
                .andExpect(status().isOk());

        verify(service).answer(eq("Have I met my deductible?"), eq("5"));
    }
}
