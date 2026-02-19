package com.company.inventory.controller;

import com.company.inventory.dto.request.LoginRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.AuthResponse;
import com.company.inventory.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Authentication APIs")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    @Operation(summary = "User login", description = "Authenticate user and get JWT token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    @PostMapping("/init-users")
    @Operation(summary = "Initialize default users", description = "Create default owner and manager users")
    public ResponseEntity<ApiResponse<String>> initializeUsers() {
        authService.initializeDefaultUsers();
        return ResponseEntity.ok(ApiResponse.success(
            "Default users initialized. Owner: username=owner, password=owner123 | Manager: username=manager, password=manager123", 
            null
        ));
    }
}