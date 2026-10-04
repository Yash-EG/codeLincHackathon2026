package com.codelinc.dental.service.data;

import java.time.LocalDate;

/**
 * A recent dental appointment and what it recommended, used to verify a user's claim that "my
 * dentist recommended" a procedure.
 *
 * <p>Backend-owned data-access port return type. The orchestrator confirms a recommendation by
 * finding an appointment whose {@link #recommendedCdtCode()} matches the trusted procedure the user
 * is asking about. The AI's say-so is never sufficient; this is the trusted evidence.
 *
 * @param appointmentId      the appointment id
 * @param visitDate          when the appointment occurred
 * @param recommendedCdtCode the CDT code recommended at that visit (may be {@code null} if the visit
 *                           recommended nothing)
 * @param recommendedTooth   the tooth the recommendation applies to, or {@code null}
 */
public record RecentAppointment(
        String appointmentId,
        LocalDate visitDate,
        String recommendedCdtCode,
        Integer recommendedTooth
) {
    /** True if this appointment recommended the given trusted CDT code. */
    public boolean recommends(String cdtCode) {
        return recommendedCdtCode != null && recommendedCdtCode.equalsIgnoreCase(cdtCode);
    }
}
