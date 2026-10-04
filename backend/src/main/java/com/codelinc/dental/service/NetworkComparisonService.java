package com.codelinc.dental.service;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.model.NetworkTier;
import com.codelinc.dental.service.calc.BenefitUsage;
import com.codelinc.dental.service.calc.NetworkComparison;
import com.codelinc.dental.service.calc.PlanRules;
import com.codelinc.dental.service.calc.ProcedureCharge;
import com.codelinc.dental.service.calc.ProcedureCoverage;
import org.springframework.stereotype.Service;

/**
 * Prices one procedure under both networks so the user can compare in- vs out-of-network cost.
 *
 * <p><strong>The two estimates are independent.</strong> Each is calculated with its own network's
 * coverage and its own benefit-usage snapshot, and both snapshots are derived from the <em>same
 * original</em> benefit state. The in-network estimate is a hypothetical ("what if you went
 * in-network") and so is the out-of-network one; a hypothetical must not spend down benefits that
 * the other hypothetical would then see. Because {@link BenefitUsage} is immutable and
 * {@link BenefitCalculatorService} is stateless and never writes back, calculating one side can have
 * no effect on the other regardless of call order.
 *
 * <p>Both results are returned already labeled with their {@link NetworkTier}.
 */
@Service
public class NetworkComparisonService {

    private final BenefitCalculatorService calculator;

    public NetworkComparisonService(BenefitCalculatorService calculator) {
        this.calculator = calculator;
    }

    /**
     * Compare the cost of one procedure in- and out-of-network.
     *
     * <p>The two usage snapshots must both reflect the <em>same original</em> benefit state at the
     * start of this comparison (in-network and out-of-network may legitimately differ, e.g. a plan
     * with a separate out-of-network annual maximum). Neither snapshot should be a post-estimate
     * value; this method does not chain the first estimate into the second.
     *
     * @param charge       the procedure to price (shared across both networks)
     * @param inCoverage   in-network coverage terms (must be labeled {@link NetworkTier#IN_NETWORK})
     * @param outCoverage  out-of-network coverage terms (must be labeled {@link NetworkTier#OUT_OF_NETWORK})
     * @param inUsage      the original benefit snapshot for in-network (must be IN_NETWORK)
     * @param outUsage     the original benefit snapshot for out-of-network (must be OUT_OF_NETWORK)
     * @param plan         static plan terms (out-of-network allowed ratio)
     * @return both labeled estimates
     * @throws IllegalArgumentException if any argument's network label is wrong
     */
    public NetworkComparison compare(ProcedureCharge charge,
                                     ProcedureCoverage inCoverage,
                                     ProcedureCoverage outCoverage,
                                     BenefitUsage inUsage,
                                     BenefitUsage outUsage,
                                     PlanRules plan) {
        requireNetwork(inCoverage.networkTier(), NetworkTier.IN_NETWORK, "inCoverage");
        requireNetwork(outCoverage.networkTier(), NetworkTier.OUT_OF_NETWORK, "outCoverage");
        requireNetwork(inUsage.networkTier(), NetworkTier.IN_NETWORK, "inUsage");
        requireNetwork(outUsage.networkTier(), NetworkTier.OUT_OF_NETWORK, "outUsage");

        // Each call reads an immutable snapshot and returns a fresh estimate; the two are fully
        // independent, so order does not matter and neither consumes the other's benefits.
        BenefitEstimate inNetwork = calculator.calculate(charge, inCoverage, inUsage, plan);
        BenefitEstimate outOfNetwork = calculator.calculate(charge, outCoverage, outUsage, plan);

        return new NetworkComparison(inNetwork, outOfNetwork);
    }

    private static void requireNetwork(NetworkTier actual, NetworkTier expected, String argName) {
        if (actual != expected) {
            throw new IllegalArgumentException(
                    argName + " must be " + expected + " but was " + actual);
        }
    }
}
