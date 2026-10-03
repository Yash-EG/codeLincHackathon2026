package com.codelinc.dental;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point for the codeLinc dental benefits backend.
 *
 * <p>This is a hackathon foundation: it wires up Spring Web, JPA (no entities yet),
 * and an Amazon Bedrock abstraction. Two backend developers can build on top of the
 * package layout under {@code com.codelinc.dental} without colliding.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class DentalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(DentalBackendApplication.class, args);
    }
}
