package com.codelinc.dental.controller;

import com.codelinc.dental.dto.AnalysisResponse;
import com.codelinc.dental.dto.AnalyzeRequest;
import com.codelinc.dental.service.AnalysisService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The main analysis endpoint.
 *
 * <p>{@code POST /api/analyze} with {@code {"userId":"...","message":"..."}} returns an
 * {@link AnalysisResponse}: either structured estimate(s) with their network labels and (when
 * available) explanations, plus optional treatment-timing guidance; or a single clarification
 * question when the request can't be answered yet.
 *
 * <p>The client supplies only the user id and the natural-language message. It never supplies plan
 * rules, prices, coverage, or usage — those trusted facts are loaded server-side for {@code userId}.
 * This controller is a thin pass-through to {@link AnalysisService}; all orchestration, trust
 * verification and math live there.
 */
@RestController
@RequestMapping("/api/analyze")
public class AnalysisController {

    private final AnalysisService analysisService;

    public AnalysisController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping
    public AnalysisResponse analyze(@Valid @RequestBody AnalyzeRequest request) {
        return analysisService.analyze(request.userId(), request.message(), request.pending());
    }
}
