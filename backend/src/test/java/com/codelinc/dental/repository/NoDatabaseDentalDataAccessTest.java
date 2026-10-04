package com.codelinc.dental.repository;

import com.codelinc.dental.exception.DatabaseUnavailableException;
import com.codelinc.dental.model.NetworkTier;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Without the {@code db} profile every data lookup fails loudly with a message that says how to
 * enable the database. It must never answer with empty or made-up data.
 */
class NoDatabaseDentalDataAccessTest {

    private final NoDatabaseDentalDataAccess data = new NoDatabaseDentalDataAccess();

    @Test
    void everyLookupSaysTheDatabaseIsNeeded() {
        assertThatThrownBy(() -> data.findActivePlan("1"))
                .isInstanceOf(DatabaseUnavailableException.class)
                .hasMessageContaining("db profile");
        assertThatThrownBy(() -> data.resolveProcedure("crown"))
                .isInstanceOf(DatabaseUnavailableException.class);
        assertThatThrownBy(() -> data.findCoverage("1", "D2740", NetworkTier.IN_NETWORK))
                .isInstanceOf(DatabaseUnavailableException.class);
        assertThatThrownBy(() -> data.findBenefitUsage("1", 2026, NetworkTier.OUT_OF_NETWORK))
                .isInstanceOf(DatabaseUnavailableException.class);
        assertThatThrownBy(() -> data.findRecentAppointments("1"))
                .isInstanceOf(DatabaseUnavailableException.class);
    }
}
