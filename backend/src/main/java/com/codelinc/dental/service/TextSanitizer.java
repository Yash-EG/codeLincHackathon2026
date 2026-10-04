package com.codelinc.dental.service;

/**
 * Shared helpers for cleaning up free-text model output before it reaches the UI.
 *
 * <p>The prompts instruct the model to return plain text, but models sometimes still
 * emit markdown (bold {@code **}, headings {@code #}, backticks, bullet/numbered lists).
 * The frontend renders answers as plain text, so stray markdown shows up as literal
 * {@code **} or {@code #} characters. {@link #stripMarkdown(String)} removes the
 * formatting syntax while preserving the words, as a defensive net behind the prompt.
 */
public final class TextSanitizer {

    private TextSanitizer() {
    }

    /**
     * Strip common markdown formatting from model output, keeping the text content.
     *
     * @param text raw model text (may be {@code null})
     * @return cleaned plain text; empty string if {@code text} is {@code null}
     */
    public static String stripMarkdown(String text) {
        if (text == null) {
            return "";
        }
        String s = text.trim();
        // Bold/italic: **x**, __x__  ->  x
        s = s.replaceAll("(\\*\\*|__)(.*?)\\1", "$2");
        // Single-char emphasis: *x* or _x_  ->  x  (avoid touching mid-word underscores)
        s = s.replaceAll("(?<!\\w)[*_](\\S.*?\\S|\\S)[*_](?!\\w)", "$1");
        // Code fences and inline code
        s = s.replace("```", "").replace("`", "");
        // Heading hashes and blockquote markers at line starts
        s = s.replaceAll("(?m)^\\s{0,3}#{1,6}\\s*", "");
        s = s.replaceAll("(?m)^\\s{0,3}>\\s?", "");
        // Bullet or numbered list markers at line starts
        s = s.replaceAll("(?m)^\\s{0,3}[-*+]\\s+", "");
        s = s.replaceAll("(?m)^\\s{0,3}\\d+\\.\\s+", "");
        // Tidy whitespace
        s = s.replaceAll("[ \\t]+(?=\\n)", "");
        s = s.replaceAll("\\n{3,}", "\n\n");
        return s.trim();
    }
}
