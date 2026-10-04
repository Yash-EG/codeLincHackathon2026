package com.codelinc.dental.service;

import com.codelinc.dental.intent.DentalIntent;
import com.codelinc.dental.intent.IntentExtractor;
import com.codelinc.dental.intent.KeywordIntentExtractor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

/**
 * The {@link IntentExtractor} the analyzer uses: Bedrock first, and keyword matching when Bedrock
 * fails (no credentials, an expired key, a timeout, an unreadable reply).
 *
 * <p>Before this, a Bedrock failure turned every cost question into a 502, even though the
 * database and the calculator were fine. The fallback only names which catalog procedure was asked
 * about; every number still comes from the database and the calculator.
 */
@Service
@Primary
public class ResilientIntentExtractor implements IntentExtractor {

    private static final Logger log = LoggerFactory.getLogger(ResilientIntentExtractor.class);

    private final BedrockIntentExtractor bedrock;
    private final KeywordIntentExtractor keywords = new KeywordIntentExtractor();

    public ResilientIntentExtractor(BedrockIntentExtractor bedrock) {
        this.bedrock = bedrock;
    }

    @Override
    public DentalIntent interpret(String message) {
        try {
            return bedrock.interpret(message);
        } catch (RuntimeException e) {
            log.warn("Bedrock couldn't read the question ({}); falling back to keyword matching.", e.getMessage());
            return keywords.interpret(message);
        }
    }
}
