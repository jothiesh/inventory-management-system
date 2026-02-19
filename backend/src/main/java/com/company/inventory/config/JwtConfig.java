package com.company.inventory.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JWT Configuration Properties
 * Binds jwt.* properties from application.properties
 */
@Configuration
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtConfig {
    
    /**
     * JWT secret key (must be at least 256 bits for HS256)
     * Bound from: jwt.secret
     */
    private String secret;
    
    /**
     * JWT token expiration time in milliseconds
     * Default: 86400000 (24 hours)
     * Bound from: jwt.expiration
     */
    private Long expiration;
}