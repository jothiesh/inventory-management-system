package com.company.inventory.config;

import com.company.inventory.security.JwtAuthenticationFilter;
import com.company.inventory.security.UserDetailsServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
@Slf4j
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final JwtAuthenticationFilter jwtAuthFilter;

    @Value("${cors.allowed-origins:http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:5173,http://localhost:3001}")
    private String allowedOriginsStr;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        log.debug("Assembling data access authentication authorization providers mappings matching custom system user service models.");
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("Constructing core system SecurityFilterChain application access control definitions matrix rules engine.");

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth

                // ── Public ───────────────────────────────────────────
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/init/**").permitAll()
                .requestMatchers("/api/test/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/h2-console/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()

                // ── Static frontend files ────────────────────────────
                .requestMatchers("/", "/index.html", "/static/**", "/assets/**",
                        "/*.js", "/*.css", "/*.ico", "/*.svg", "/*.png", "/*.json").permitAll()

                // ── Owner only ───────────────────────────────────────
                .requestMatchers("/api/owner/**").hasAuthority("OWNER")

                // ── Purchase Requests — authenticated ────────────────
                .requestMatchers("/api/purchase-requests/**").authenticated()

                // ── Purchase Orders — authenticated ──────────────────
                .requestMatchers("/api/purchase-orders/**").authenticated()

                // ── QC Module ────────────────────────────────────────
                // GET reads: QC, OWNER, STORE_MANAGER can view invoices / batches / alerts
                .requestMatchers("GET", "/api/qc/**")
                    .hasAnyAuthority("QC", "OWNER", "STORE_MANAGER")

                // QC decisions (approve / reject): QC only
                .requestMatchers("POST", "/api/qc/decisions/**")
                    .hasAuthority("QC")

                // Alert acknowledgement: QC only (must come BEFORE catch-all below)
                .requestMatchers("PUT", "/api/qc/alerts/**")
                    .hasAuthority("QC")

                // Invoice upload / create / link (write ops): QC, OWNER, STORE_MANAGER
                .requestMatchers("POST", "/api/qc/invoices/**")
                    .hasAnyAuthority("QC", "OWNER", "STORE_MANAGER")

                // Invoice update (PUT): QC, OWNER, STORE_MANAGER
                .requestMatchers("PUT", "/api/qc/invoices/**")
                    .hasAnyAuthority("QC", "OWNER", "STORE_MANAGER")

                // Everything else under /api/qc/**: QC, OWNER, STORE_MANAGER
                .requestMatchers("/api/qc/**")
                    .hasAnyAuthority("QC", "OWNER", "STORE_MANAGER")

                // ── All other API — authenticated ────────────────────
                .requestMatchers("/api/**").authenticated()

                // ── React Router paths ───────────────────────────────
                .anyRequest().permitAll()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .headers(headers -> headers.frameOptions(frame -> frame.disable()));

        SecurityFilterChain builtChain = http.build();
        log.info("System SecurityFilterChain constructed and registered cleanly inside active security context profiles.");
        return builtChain;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        log.info("Compiling cross-origin resource sharing (CORS) whitelists. Intercepting configured values string.");
        CorsConfiguration configuration = new CorsConfiguration();

        List<String> origins = Arrays.asList(allowedOriginsStr.split(","));
        log.info("CORS Policy: Injecting active allowed source access domain arrays mapping nodes: {}", origins);
        configuration.setAllowedOrigins(origins);

        configuration.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"
        ));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        configuration.setExposedHeaders(Arrays.asList(
                "Authorization", "Content-Disposition"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}