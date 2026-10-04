package com.codelinc.dental.service.data;

import com.codelinc.dental.dto.MemberSummary;

import java.util.List;

/**
 * The employees the front desk can check in, with their plan and this year's usage. Implemented
 * over the database under the {@code db} profile ({@code JdbcMemberDirectory}); without a database
 * there is no implementation and {@code GET /api/members} answers 503.
 */
public interface MemberDirectory {

    /** Every member, ordered by name, with usage summed for {@code benefitYear}. */
    List<MemberSummary> listMembers(int benefitYear);
}
