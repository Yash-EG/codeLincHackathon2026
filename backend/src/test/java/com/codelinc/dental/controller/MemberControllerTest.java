package com.codelinc.dental.controller;

import com.codelinc.dental.dto.MemberSummary;
import com.codelinc.dental.dto.MemberSummary.CoverageRule;
import com.codelinc.dental.service.data.MemberDirectory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code GET /api/members} with a member directory available (the {@code db} profile's case): it
 * lists members for the current benefit year, taken from the clock.
 */
@WebMvcTest(MemberController.class)
@ActiveProfiles("test")
@Import(MemberControllerTest.FixedClock.class)
class MemberControllerTest {

    @TestConfiguration
    static class FixedClock {
        @Bean
        Clock clock() {
            return Clock.fixed(Instant.parse("2026-06-01T12:00:00Z"), ZoneOffset.UTC);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private MemberDirectory directory;

    @Test
    void listsMembersForTheCurrentBenefitYear() throws Exception {
        when(directory.listMembers(2026)).thenReturn(List.of(new MemberSummary(
                "3",
                "Maya Patel",
                "Demo PPO",
                new BigDecimal("1500.00"),
                new BigDecimal("50.00"),
                LocalDate.parse("2026-01-01"),
                LocalDate.parse("2026-12-31"),
                2026,
                new BigDecimal("285.00"),
                new BigDecimal("1215.00"),
                new BigDecimal("50.00"),
                List.of(new CoverageRule("BASIC", "IN_NETWORK", new BigDecimal("80.00"), true)))));

        mockMvc.perform(get("/api/members"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("3"))
                .andExpect(jsonPath("$[0].fullName").value("Maya Patel"))
                .andExpect(jsonPath("$[0].planName").value("Demo PPO"))
                .andExpect(jsonPath("$[0].benefitYear").value(2026))
                .andExpect(jsonPath("$[0].usedThisYear").value(285.00))
                .andExpect(jsonPath("$[0].remainingMaximum").value(1215.00))
                .andExpect(jsonPath("$[0].planYearEnd").value("2026-12-31"))
                .andExpect(jsonPath("$[0].coverage[0].category").value("BASIC"))
                .andExpect(jsonPath("$[0].coverage[0].planPaysPct").value(80.00))
                .andExpect(jsonPath("$[0].coverage[0].deductibleApplies").value(true));
    }
}
