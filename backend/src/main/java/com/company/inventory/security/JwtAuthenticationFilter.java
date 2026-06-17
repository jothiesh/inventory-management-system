package com.company.inventory.security;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        String path = request.getRequestURI();
        String method = request.getMethod();
        log.trace("Intercepted incoming HTTP request: [{}] {}", method, path);

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        // Check if Authorization header exists and starts with "Bearer "
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.trace("Missing or non-bearer Authorization header for path: {}. Passing to next filter.", path);
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        
        try {
            // Extract username from JWT
            username = jwtTokenProvider.extractUsername(jwt);
            log.trace("Extracted claim subject username '{}' from incoming JWT payload.", username);

            // If username is valid and no authentication exists yet
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug("Initializing security profile lookup for user context: '{}'", username);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);

                // Validate token
                if (jwtTokenProvider.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    log.info("Successfully authenticated user context '{}'. Granted Authorities: {}", username, userDetails.getAuthorities());
                } else {
                    log.warn("JWT token verification failed structurally for user claim context: '{}'", username);
                }
            }
            
            filterChain.doFilter(request, response);
            
        } catch (ExpiredJwtException e) {
            log.warn("Authentication rejected: JWT token has expired. Path: {}, Message: {}", path, e.getMessage());
            
            // Send 401 with clear message for expired token
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\": false, " +
                "\"message\": \"Token expired. Please log in again.\", " +
                "\"error\": \"EXPIRED_TOKEN\"}"
            );
            
        } catch (JwtException e) {
            log.error("Authentication rejected: Faulty signature or structural parsing error on JWT token. Message: {}", e.getMessage());
            
            // Send 401 for invalid token
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\": false, " +
                "\"message\": \"Invalid authentication token\", " +
                "\"error\": \"INVALID_TOKEN\"}"
            );
            
        } catch (Exception e) {
            log.error("Unhandled exception intercepted inside JWT internal authentication processing chain: ", e);
            
            // Send 500 for other errors
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.setContentType("application/json");
            response.getWriter().write(
                "{\"success\": false, " +
                "\"message\": \"Authentication error\", " +
                "\"error\": \"AUTH_ERROR\"}"
            );
        }
    }
}