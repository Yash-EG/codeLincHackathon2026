package com.codelinc.dental.controller;

import com.codelinc.dental.dto.ErrorResponse;
import com.codelinc.dental.service.data.MemberDirectory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.Year;

/**
 * {@code GET /api/members}: the employees the Reception desk can check in, each with their plan,
 * coverage and this benefit year's usage. The id in each entry is the {@code userId} that
 * {@code POST /api/analyze} takes.
 *
 * <p>The list comes from the database, so it needs the {@code db} profile. Without it there is no
 * {@link MemberDirectory} and this answers 503 with a message saying so, instead of failing the
 * whole app at startup.
 */
@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final ObjectProvider<MemberDirectory> directory;
    private final Clock clock;

    public MemberController(ObjectProvider<MemberDirectory> directory, Clock clock) {
        this.directory = directory;
        this.clock = clock;
    }

    @GetMapping
    public ResponseEntity<?> list() {
        MemberDirectory members = directory.getIfAvailable();
        if (members == null) {
            HttpStatus status = HttpStatus.SERVICE_UNAVAILABLE;
            return ResponseEntity.status(status).body(ErrorResponse.of(
                    status.value(),
                    status.getReasonPhrase(),
                    "The member list needs the database. Start the backend with the db profile."));
        }
        return ResponseEntity.ok(members.listMembers(Year.now(clock).getValue()));
    }
}
