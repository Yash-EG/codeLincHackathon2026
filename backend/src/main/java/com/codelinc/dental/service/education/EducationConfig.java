package com.codelinc.dental.service.education;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wiring for the benefits-education capability.
 *
 * <p>Provides a fallback {@link PlanFactsProvider} ONLY when no other bean of
 * that type exists. This is the documented seam for Jay: when his verified,
 * authenticated provider is registered as a Spring bean, it automatically takes
 * precedence over {@link UnavailablePlanFactsProvider} with no change here.
 */
@Configuration
public class EducationConfig {

    @Bean
    @ConditionalOnMissingBean(PlanFactsProvider.class)
    public PlanFactsProvider unavailablePlanFactsProvider() {
        return new UnavailablePlanFactsProvider();
    }
}
