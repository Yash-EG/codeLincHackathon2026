package com.codelinc.dental.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

/**
 * Provides a {@link Clock} bean so time-dependent logic (e.g. deriving the current benefit year in
 * {@code AnalysisService}) depends on an injectable clock rather than calling {@code LocalDate.now()}
 * directly. Tests inject a fixed clock to make benefit-year derivation deterministic.
 */
@Configuration
public class ClockConfig {

    @Bean
    public Clock systemClock() {
        return Clock.systemDefaultZone();
    }
}
