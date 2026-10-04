package com.codelinc.dental.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Centralized CORS configuration.
 *
 * <p><strong>Development policy: fully permissive.</strong> Any origin is reflected so the
 * frontend works regardless of which port Vite picks (5173, 5174, …). This is intentionally
 * wide open to unblock local development. The {@code app.cors.allowed-origins} property is no
 * longer consulted while this policy is in effect.
 *
 * <p><strong>Before production:</strong> replace {@code allowedOriginPatterns("*")} with an
 * explicit allow-list and reconsider {@code allowCredentials}.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Fully permissive for development: reflect any origin. We use
        // allowedOriginPatterns("*") rather than allowedOrigins("*") because the
        // CORS spec forbids the "*" origin together with allowCredentials(true) —
        // the pattern form reflects the caller's origin back so credentials still work.
        // NOTE: this is wide open; restrict allowed origins before any production use.
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("*")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
