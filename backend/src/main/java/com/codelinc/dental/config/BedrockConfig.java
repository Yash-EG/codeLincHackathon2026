package com.codelinc.dental.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.bedrockruntime.BedrockRuntimeClient;

/**
 * Builds the Amazon Bedrock runtime client as a single, reusable Spring bean.
 *
 * <p>The region comes from {@link AwsBedrockProperties} (centralized config), never
 * hardcoded in services. Credentials are resolved by the AWS SDK's default provider
 * chain, which includes the {@code AWS_BEARER_TOKEN_BEDROCK} environment variable the
 * developer already has in their shell, as well as standard profiles and IAM roles.
 * No credentials are read or stored by application code.
 */
@Configuration
public class BedrockConfig {

    @Bean
    public BedrockRuntimeClient bedrockRuntimeClient(AwsBedrockProperties properties) {
        return BedrockRuntimeClient.builder()
                .region(Region.of(properties.region()))
                .build();
    }
}
