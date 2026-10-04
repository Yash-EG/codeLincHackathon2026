package com.codelinc.dental.service.calc;

import com.codelinc.dental.dto.BenefitEstimate;
import com.codelinc.dental.model.NetworkTier;

import java.util.List;

/**
 * The structured result of pricing one procedure both in- and out-of-network.
 *
 * <p>Each side is a fully labeled {@link BenefitEstimate} carrying its own
 * {@link NetworkTier}. The two estimates are calculated independently from the same original
 * benefit-usage state, so neither consumes benefits the other then sees. This record keeps them
 * together with compile-time guarantees about which is which; {@code AnalysisService} maps it into a
 * two-element {@link com.codelinc.dental.dto.AnalysisResponse} for the API.
 *
 * @param inNetwork    the estimate under in-network rules (label {@link NetworkTier#IN_NETWORK})
 * @param outOfNetwork the estimate under out-of-network rules (label {@link NetworkTier#OUT_OF_NETWORK})
 */
public record NetworkComparison(
        BenefitEstimate inNetwork,
        BenefitEstimate outOfNetwork
) {
    public NetworkComparison {
        if (inNetwork == null || outOfNetwork == null) {
            throw new IllegalArgumentException("both estimates are required");
        }
        if (inNetwork.networkTier() != NetworkTier.IN_NETWORK) {
            throw new IllegalArgumentException("inNetwork estimate must be labeled IN_NETWORK");
        }
        if (outOfNetwork.networkTier() != NetworkTier.OUT_OF_NETWORK) {
            throw new IllegalArgumentException("outOfNetwork estimate must be labeled OUT_OF_NETWORK");
        }
    }

    /** Both estimates as a list, in-network first — convenient for building the API response. */
    public List<BenefitEstimate> asList() {
        return List.of(inNetwork, outOfNetwork);
    }
}
