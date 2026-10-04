package com.codelinc.dental.intent;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The frontend sends each question with a context preamble (the intake form and the chat so far),
 * then "Current question: ..." (see frontend/src/lib/useAssistant.ts). The AI reads all of it, but
 * anything parsed by rule must read only the current question: the preamble holds earlier prices
 * like "$1,110.00", whose "1" would otherwise be taken for tooth #1, and earlier procedures.
 */
public final class ConversationText {

    private static final Pattern MARKER = Pattern.compile("(?i)current question:");

    private ConversationText() {
    }

    /** The text after the last "Current question:" marker, or the whole message when there is none. */
    public static String currentQuestion(String message) {
        if (message == null) {
            return null;
        }
        Matcher m = MARKER.matcher(message);
        int end = -1;
        while (m.find()) {
            end = m.end();
        }
        return end < 0 ? message : message.substring(end).trim();
    }
}
