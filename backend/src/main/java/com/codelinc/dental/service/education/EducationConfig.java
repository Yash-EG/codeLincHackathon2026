package com.codelinc.dental.service.education;

import com.codelinc.dental.service.data.DentalDataAccess;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Wiring for the benefits-education capability.
 *
 * <p>Two {@link PlanFactsProvider} beans, selected by Spring profile and ordered so the
 * right one wins without any change at the call site:
 * <ul>
 *   <li>Under the {@code db} profile a {@link DataAccessPlanFactsProvider} is registered,
 *       sourcing verified facts from the trusted {@link DentalDataAccess} port. Because the
 *       fallback below is {@code @ConditionalOnMissingBean}, this real provider takes
 *       precedence automatically.</li>
 *   <li>Otherwise {@link UnavailablePlanFactsProvider} remains the fallback, so personal-plan
 *       questions stay honestly "unavailable" when there is no trusted source.</li>
 * </ul>
 *
 * <p>This is also the documented seam for Jay's authenticated provider: registering his bean
 * (e.g. gated on an auth profile) likewise supersedes the fallback with no change here.
 */
@Configuration
public class EducationConfig {

    /**
     * Real, trusted-data provider. Active only when the {@code db} profile is on (so the
     * {@link DentalDataAccess} bean exists). The demo member id and the representative
     * coinsurance procedure are configurable; see {@link DataAccessPlanFactsProvider} for why
     * member resolution is a demo stand-in rather than real authentication.
     */
    @Bean
    @Profile("db")
    public PlanFactsProvider dataAccessPlanFactsProvider(
            DentalDataAccess dentalDataAccess,
            @Value("${education.plan-facts.demo-member-id:1}") String demoMemberId,
            @Value("${education.plan-facts.coinsurance-sample-cdt:D2740}") String coinsuranceSampleCdt) {
        return new DataAccessPlanFactsProvider(dentalDataAccess, demoMemberId, coinsuranceSampleCdt);
    }

    @Bean
    @ConditionalOnMissingBean(PlanFactsProvider.class)
    public PlanFactsProvider unavailablePlanFactsProvider() {
        return new UnavailablePlanFactsProvider();
    }
}
