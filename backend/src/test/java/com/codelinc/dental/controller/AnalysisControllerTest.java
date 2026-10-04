package com.codelinc.dental.controller;

import com.codelinc.dental.dto.AnalysisResponse;
import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.dto.PendingProcedure;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.AnalysisService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-level tests for {@code POST /api/analyze}. The {@link AnalysisService} is mocked so this
 * exercises only HTTP concerns: request binding, validation, delegation, and JSON serialization of
 * both response kinds.
 */
@WebMvcTest(AnalysisController.class)
@ActiveProfiles("test")
class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalysisService analysisService;

    @Test
    void returnsStructuredEstimatesWithNetworkLabels() throws Exception {
        BenefitEstimate in = new BenefitEstimate(
                "D2740", "Crown", 19, NetworkTier.IN_NETWORK,
                new BigDecimal("1400.00"), new BigDecimal("1400.00"),
                new BigDecimal("600.00"), new BigDecimal("800.00"),
                BigDecimal.ZERO, new BigDecimal("100.00"), BigDecimal.ZERO,
                "Your plan pays 600 in network.");
        BenefitEstimate out = new BenefitEstimate(
                "D2740", "Crown", 19, NetworkTier.OUT_OF_NETWORK,
                new BigDecimal("1400.00"), new BigDecimal("1400.00"),
                new BigDecimal("560.00"), new BigDecimal("840.00"),
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("940.00"),
                "Out of network the plan pays 560.");
        AnalysisResponse estimateResponse =
                AnalysisResponse.ofEstimates(List.of(in, out), "Crown comparison.");

        when(analysisService.analyze(eq("1"), eq("crown in vs out?"), eq(null)))
                .thenReturn(estimateResponse);

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\",\"message\":\"crown in vs out?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("ESTIMATE"))
                .andExpect(jsonPath("$.estimates.length()").value(2))
                .andExpect(jsonPath("$.estimates[0].networkTier").value("IN_NETWORK"))
                .andExpect(jsonPath("$.estimates[0].planPays").value(600.00))
                .andExpect(jsonPath("$.estimates[0].explanation").value("Your plan pays 600 in network."))
                .andExpect(jsonPath("$.estimates[1].networkTier").value("OUT_OF_NETWORK"))
                .andExpect(jsonPath("$.clarificationQuestion").doesNotExist());
    }

    @Test
    void returnsClarificationWhenServiceAsksAQuestion() throws Exception {
        when(analysisService.analyze(eq("1"), eq("huh?"), eq(null)))
                .thenReturn(AnalysisResponse.ofClarification("Which procedure do you mean?"));

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\",\"message\":\"huh?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("CLARIFICATION"))
                .andExpect(jsonPath("$.clarificationQuestion").value("Which procedure do you mean?"))
                .andExpect(jsonPath("$.estimates.length()").value(0));
    }

    @Test
    void bindsPendingAndForwardsItToTheService() throws Exception {
        BenefitEstimate in = new BenefitEstimate(
                "D2740", "Crown", 19, NetworkTier.IN_NETWORK,
                new BigDecimal("1400.00"), new BigDecimal("1400.00"),
                new BigDecimal("600.00"), new BigDecimal("800.00"),
                BigDecimal.ZERO, new BigDecimal("100.00"), BigDecimal.ZERO,
                "Your plan pays 600 in network.");
        when(analysisService.analyze(
                eq("1"), eq("19"), eq(new PendingProcedure("D2740", "Crown"))))
                .thenReturn(AnalysisResponse.ofEstimates(List.of(in), "Crown comparison."));

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\",\"message\":\"19\","
                                + "\"pending\":{\"cdtCode\":\"D2740\",\"procedureName\":\"Crown\"}}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("ESTIMATE"))
                .andExpect(jsonPath("$.estimates[0].toothNumber").value(19));
    }

    @Test
    void serializesPendingOnAClarificationResponse() throws Exception {
        when(analysisService.analyze(eq("1"), eq("crown"), eq(null)))
                .thenReturn(AnalysisResponse.ofClarification(
                        "A Crown is billed per tooth. Which tooth is it (for example #19)?",
                        new PendingProcedure("D2740", "Crown")));

        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\",\"message\":\"crown\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.kind").value("CLARIFICATION"))
                .andExpect(jsonPath("$.pending.cdtCode").value("D2740"))
                .andExpect(jsonPath("$.pending.procedureName").value("Crown"));
    }

    @Test
    void rejectsBlankUserIdWith400() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"\",\"message\":\"crown?\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void rejectsMissingMessageWith400() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"userId\":\"1\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rejectsMalformedJsonWith400() throws Exception {
        mockMvc.perform(post("/api/analyze")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not json"))
                .andExpect(status().isBadRequest());
    }
}
