package com.company.inventory.service;

import com.company.inventory.dto.request.LoginRequest;
import com.company.inventory.dto.response.AuthResponse;
import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import com.company.inventory.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            log.info("Login attempt for user: {}", request.getUsername());
            
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            // Get user details
            User user = userRepository.findByUsername(request.getUsername())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found: " + request.getUsername()));

            // Check if user is active
            if (!user.getIsActive()) {
                log.warn("Login attempt for inactive user: {}", request.getUsername());
                throw new BadCredentialsException("User account is inactive");
            }

            // Update last login
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);

            // Generate JWT token
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtTokenProvider.generateToken(userDetails);

            log.info("Login successful for user: {}", request.getUsername());

            // Return response
            return new AuthResponse(
                    token,
                    user.getUserId(),
                    user.getUsername(),
                    user.getFullName(),
                    user.getRole().name(),  // ✅ FIXED: Convert enum to String
                    user.getEmail()
            );
            
        } catch (BadCredentialsException e) {
            log.error("Login failed for user {}: Bad credentials", request.getUsername());
            throw new BadCredentialsException("Invalid username or password");
        } catch (Exception e) {
            log.error("Login failed for user {}: {}", request.getUsername(), e.getMessage());
            throw e;
        }
    }

    @Transactional
    public void initializeDefaultUsers() {
        log.info("Initializing default users...");
        
        // Create Owner if not exists
        if (!userRepository.existsByUsername("owner")) {
            User owner = new User();
            owner.setUsername("owner");
            owner.setPasswordHash(passwordEncoder.encode("owner123"));
            owner.setFullName("Store Owner");
            owner.setRole(User.UserRole.OWNER);  // ✅ FIXED: Use enum
            owner.setEmail("owner@company.com");
            owner.setPhone("9876543210");
            owner.setIsActive(true);
            owner.setCreatedAt(LocalDateTime.now());
            owner.setUpdatedAt(LocalDateTime.now());
            userRepository.save(owner);
            
            log.info("✅ Default Owner created - Username: owner, Password: owner123");
            System.out.println("✅ Default Owner created - Username: owner, Password: owner123");
        } else {
            log.info("Owner user already exists");
        }

        // Create Store Manager if not exists
        if (!userRepository.existsByUsername("manager")) {
            User manager = new User();
            manager.setUsername("manager");
            manager.setPasswordHash(passwordEncoder.encode("manager123"));
            manager.setFullName("Store Manager");
            manager.setRole(User.UserRole.STORE_MANAGER);  // ✅ FIXED: Use enum
            manager.setEmail("manager@company.com");
            manager.setPhone("9876543211");
            manager.setIsActive(true);
            manager.setCreatedAt(LocalDateTime.now());
            manager.setUpdatedAt(LocalDateTime.now());
            userRepository.save(manager);
            
            log.info("✅ Default Store Manager created - Username: manager, Password: manager123");
            System.out.println("✅ Default Store Manager created - Username: manager, Password: manager123");
        } else {
            log.info("Manager user already exists");
        }
        
        log.info("Default users initialization completed");
    }

    public User getCurrentUser(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}