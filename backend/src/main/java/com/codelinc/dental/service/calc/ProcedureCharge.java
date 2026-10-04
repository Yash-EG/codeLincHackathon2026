package com.codelinc.dental.service.calc;

/**
 * The procedure to be priced, as handed to {@link com.codelinc.dental.service.BenefitCalculatorService}.
 *
 * <p>This is a <strong>backend-local, fake-friendly input abstraction</strong>, not a shared domain
 * type. It stands in for the teammate-owned {@code ProcedureReference} (which does not yet exist on
 * this branch) so the calculator and its tests can be built now. When {@code ProcedureReference}
 * lands, {@code AnalysisService} will map it into this shape rather than this record replacing it.
 *
 * <p>Fields follow the schema: {@code cdtCode} matches {@code cdt_procedures.cdt_code} and
 * {@code toothNumber} uses the Universal Numbering System (1–32, {@code null} when the procedure is
 * not tooth-specific). Each charge prices a single unit (quantity is out of scope for the hackathon).
 *
 * @param cdtCode       the CDT code to price (e.g. {@code D2740})
 * @param procedureName human-readable name carried through to the estimate (e.g. {@code Crown})
 * @param toothNumber   Universal tooth number 1–32, or {@code null} if not tooth-specific
 */
public record ProcedureCharge(
        String cdtCode,
        String procedureName,
        Integer toothNumber
) {
    public ProcedureCharge {
        if (cdtCode == null || cdtCode.isBlank()) {
            throw new IllegalArgumentException("cdtCode must not be blank");
        }
    }
}
