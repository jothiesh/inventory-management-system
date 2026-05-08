package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/init")
@RequiredArgsConstructor
@Slf4j
public class InitController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/all")
    public ResponseEntity<?> initializeAll() {
        try {
            // Create/update Owner user
            createOrUpdateUser("owner", "owner123", "Owner", "OWNER",
                    "owner@inventrak.com", "9999999999");

            // Create/update Store Manager user
            createOrUpdateUser("manager", "manager123", "Store Manager", "STORE_MANAGER",
                    "manager@inventrak.com", "8888888888");

            log.info("✅ Default users initialized with BCrypt passwords");

            return ResponseEntity.ok(new ApiResponse<>(true,
                    "System initialized successfully. Default users created with encrypted passwords.", null));

        } catch (Exception e) {
            log.error("❌ Initialization failed: {}", e.getMessage());
            return ResponseEntity.internalServerError()
                    .body(new ApiResponse<>(false, "Initialization failed: " + e.getMessage(), null));
        }
    }

    private void createOrUpdateUser(String username, String rawPassword,
                                     String fullName, String role,
                                     String email, String phone) {
        Optional<User> existing = userRepository.findByUsername(username);

        User user;
        if (existing.isPresent()) {
            user = existing.get();
            log.info("Updating existing user: {}", username);
        } else {
            user = new User();
            log.info("Creating new user: {}", username);
        }

        user.setUsername(username);
        // ✅ FIX: Field is passwordHash, NOT password
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(fullName);
        // ✅ FIX: Enum is User.UserRole, NOT User.Role
        user.setRole(User.UserRole.valueOf(role));
        user.setEmail(email);
        user.setPhone(phone);
        user.setIsActive(true);

        userRepository.save(user);
        log.info("✅ User '{}' saved with BCrypt password", username);
    }
}