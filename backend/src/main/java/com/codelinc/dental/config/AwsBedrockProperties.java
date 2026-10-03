package com.codelinc.dental.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Centralized Amazon Bedrock configuration.
 *
 * <p>The region and model/inference ID live here (bound from {@code application.yml},
 * which in turn reads environment variables) instead of being scattered across
 * services. To change the model or region, edit configuration, not source code.
 *
 * @param region  AWS region for Bedrock, e.g. {@code us-east-2}
 * @param modelId Bedrock model / inference profile ID, e.g. {@code us.amazon.nova-2-lite-v1:0}
 */
@ConfigurationProperties(prefix = "app.bedrock")
public record AwsBedrockProperties(
        String region,
        String modelId
) {
}
