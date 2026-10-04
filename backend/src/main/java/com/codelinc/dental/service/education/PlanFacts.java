package com.codelinc.dental.service.education;

import java.math.BigDecimal;

/**
 * The narrow, read-only set of verified plan facts the education chatbot needs
 * to answer a personal-plan question. This is intentionally small: it is NOT a
 * copy of the benefit summary and does not expose repositories or entities.
 *
 * <p>Every field is nullable. A null means "this fact was not verified/provided"
 * — the chatbot must then say the amount is unavailable rather than guess. The
 * authenticated member identity is resolved by the provider from the security
 * context; this DTO never carries a user-supplied plan ID.
 *
 * <p>Coinsurance fields are stored as whole-percent plan-pays values (e.g. 80
 * means the plan pays 80%, you pay 20%). Copays, when a plan truly uses fixed
 * dollar copays, are stored as dollar amounts. A plan typically uses one model
 * or the other for a given service; the chatbot explains whichever is present
 * and corrects the user's terminology if they say "copay" but the plan uses
 * coinsurance.
 *
 * @param planName                     display name of the plan, if known
 * @param annualMaximum                annual maximum in dollars, if known
 * @param remainingAnnualMaximum       remaining annual maximum in dollars, if known
 * @param deductible                   individual deductible in dollars, if known
 * @param deductibleRemaining          deductible still to be met in dollars, if known
 * @param inNetworkCoinsurancePlanPays whole-percent the plan pays in network, if known
 * @param outOfNetworkCoinsurancePlanPays whole-percent the plan pays out of network, if known
 * @param inNetworkCopay               fixed dollar copay in network, if the plan uses one
 * @param outOfNetworkCopay            fixed dollar copay out of network, if the plan uses one
 */
public record PlanFacts(
        String planName,
        BigDecimal annualMaximum,
        BigDecimal remainingAnnualMaximum,
        BigDecimal deductible,
        BigDecimal deductibleRemaining,
        Integer inNetworkCoinsurancePlanPays,
        Integer outOfNetworkCoinsurancePlanPays,
        BigDecimal inNetworkCopay,
        BigDecimal outOfNetworkCopay
) {
    /** True when the plan uses percentage coinsurance (not a fixed copay) in network. */
    public boolean usesInNetworkCoinsurance() {
        return inNetworkCoinsurancePlanPays != null && inNetworkCopay == null;
    }

    /** True when a fixed dollar copay is defined for in-network care. */
    public boolean usesInNetworkCopay() {
        return inNetworkCopay != null;
    }
}
