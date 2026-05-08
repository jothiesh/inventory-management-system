package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Alert;
import com.company.inventory.entity.User;
import com.company.inventory.service.AlertService;
import com.company.inventory.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Alerts", description = "Alert management APIs")
public class AlertController {

    private final AlertService alertService;
    private final AuthService authService;

    @GetMapping
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get all alerts", description = "Retrieve all alerts (Owner only)")
    public ResponseEntity<ApiResponse<List<Alert>>> getAllAlerts() {
        List<Alert> alerts = alertService.getAllAlerts();
        return ResponseEntity.ok(ApiResponse.success("Alerts retrieved successfully", alerts));
    }

    @GetMapping("/unread")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get unread alerts", description = "Retrieve unread alerts (Owner only)")
    public ResponseEntity<ApiResponse<List<Alert>>> getUnreadAlerts() {
        List<Alert> alerts = alertService.getUnreadAlerts();
        return ResponseEntity.ok(ApiResponse.success("Unread alerts retrieved successfully", alerts));
    }

    @GetMapping("/unread/count")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get unread alerts count", description = "Get count of unread alerts (Owner only)")
    public ResponseEntity<ApiResponse<Long>> getUnreadAlertsCount() {
        // Changed from getUnreadAlertsCount() to getUnreadCount()
        Long count = alertService.getUnreadCount(); 
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved successfully", count));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get alerts by type", description = "Retrieve alerts by type (Owner only)")
    public ResponseEntity<ApiResponse<List<Alert>>> getAlertsByType(@PathVariable Alert.AlertType type) {
        List<Alert> alerts = alertService.getAlertsByType(type);
        return ResponseEntity.ok(ApiResponse.success("Alerts retrieved successfully", alerts));
    }

    @PutMapping("/{alertId}/read")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Mark alert as read", description = "Mark a specific alert as read (Owner only)")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long alertId,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        alertService.markAsRead(alertId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Alert marked as read", null));
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Mark all alerts as read", description = "Mark all alerts as read (Owner only)")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        alertService.markAllAsRead(currentUser);
        return ResponseEntity.ok(ApiResponse.success("All alerts marked as read", null));
    }
}