package com.company.inventory.security;

import com.company.inventory.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

/**
 * JWT Token Provider
 * Handles token generation, validation, and parsing
 * Updated for jjwt 0.12.x compatibility
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class JwtTokenProvider {

    private final JwtConfig jwtConfig;

    /**
     * Get signing key from configuration
     * Uses SecretKey instead of Key for new API
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtConfig.getSecret());
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Extract username from token
     */
    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    /**
     * Extract specific claim from token
     */
    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    /**
     * Generate token for user
     */
    public String generateToken(UserDetails userDetails) {
        return generateToken(new HashMap<>(), userDetails);
    }

    /**
     * Generate token with extra claims
     */
    public String generateToken(Map<String, Object> extraClaims, UserDetails userDetails) {
        log.info("Generating pristine signed cryptographic JWT access token token string for user subject: '{}'", userDetails.getUsername());
        return Jwts.builder()
                .claims(extraClaims)  // Changed from setClaims
                .subject(userDetails.getUsername())  // Changed from setSubject
                .issuedAt(new Date(System.currentTimeMillis()))  // Changed from setIssuedAt
                .expiration(new Date(System.currentTimeMillis() + jwtConfig.getExpiration()))  // Changed from setExpiration
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Validate token
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        boolean usernameMatches = username.equals(userDetails.getUsername());
        boolean isExpired = isTokenExpired(token);
        
        log.trace("Token parameter context calculation metrics matching execution framework. Subject matches user: {}, Is token expired: {}", 
                usernameMatches, isExpired);
        return usernameMatches && !isExpired;
    }

    /**
     * Check if token is expired
     */
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    /**
     * Extract expiration date from token
     */
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    /**
     * Extract all claims from token
     * FIXED: Uses new parser() method instead of deprecated parserBuilder()
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()  // Changed from parserBuilder()
                .verifyWith(getSigningKey())  // Changed from setSigningKey()
                .build()
                .parseSignedClaims(token)  // Changed from parseClaimsJws()
                .getPayload();  // Changed from getBody()
    }

    /**
     * Validate token (alternative method with exception handling)
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            log.error("Alternative standalone token parsing collapsed due to verification failure trace error: {}", e.getMessage());
            return false;
        }
    }
}