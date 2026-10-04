package com.codelinc.dental.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration for the benefits-EDUCATION chatbot's Bedrock usage, separate
 * from the general {@link AwsBedrockProperties} integration.
 *
 * <p>The education capability has its own system prompt and its own configurable
 * model ID (which may differ from the procedure-intent model). Region and
 * credentials still come from the shared Bedrock setup. If {@code modelId} is
 * blank or {@code enabled} is false, the chatbot falls back to a deterministic
 * plain-language rewrite so glossary questions keep working with no model.
 *
 * <p>Bound from {@code app.education.bedrock.*} in {@code application.yml}, which
 * reads the {@code EDUCATION_BEDROCK_MODEL_ID} environment variable. No model ID
 * or credentials are hardcoded.
 *
 * @param enabled whether to call Bedrock to rewrite answers (default true)
 * @param modelId Bedrock model / inference profile ID for education answers;
 *                blank means "use the deterministic fallback"
 */
@ConfigurationProperties(prefix = "app.education.bedrock")
public record EducationBedrockProperties(
        Boolean enabled,
        String modelId
) {
    public EducationBedrockProperties {
        if (enabled == null) {
            enabled = Boolean.TRUE;
        }
    }

    /** True only when enabled and a non-blank model ID is configured. */
    public boolean isModelConfigured() {
        return Boolean.TRUE.equals(enabled) && modelId != null && !modelId.isBlank();
    }
}
