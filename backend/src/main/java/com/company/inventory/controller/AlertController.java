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
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Alerts", description = "Alert management APIs")
public class AlertController {

    private final AlertService alertService;
    private final AuthService authService;

    // ── existing endpoints ────────────────────────────────────────

    @GetMapping
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get all alerts")
    public ResponseEntity<ApiResponse<List<Alert>>> getAllAlerts() {
        return ResponseEntity.ok(ApiResponse.success("Alerts retrieved", alertService.getAllAlerts()));
    }

    @GetMapping("/unread")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get unread alerts")
    public ResponseEntity<ApiResponse<List<Alert>>> getUnreadAlerts() {
        return ResponseEntity.ok(ApiResponse.success("Unread alerts retrieved", alertService.getUnreadAlerts()));
    }

    @GetMapping("/unread/count")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get unread alerts count")
    public ResponseEntity<ApiResponse<Long>> getUnreadAlertsCount() {
        return ResponseEntity.ok(ApiResponse.success("Unread count retrieved", alertService.getUnreadCount()));
    }

    @GetMapping("/type/{type}")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Get alerts by type")
    public ResponseEntity<ApiResponse<List<Alert>>> getAlertsByType(@PathVariable Alert.AlertType type) {
        return ResponseEntity.ok(ApiResponse.success("Alerts retrieved", alertService.getAlertsByType(type)));
    }

    @PutMapping("/{alertId}/read")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Mark alert as read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long alertId, Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        alertService.markAsRead(alertId, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Alert marked as read", null));
    }

    @PutMapping("/read-all")
    @PreAuthorize("hasAuthority('OWNER')")
    @Operation(summary = "Mark all alerts as read")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        alertService.markAllAsRead(currentUser);
        return ResponseEntity.ok(ApiResponse.success("All alerts marked as read", null));
    }

    // ── Stock OUT alerts — Owner + Store Manager ──────────────────

    @GetMapping("/stock-out")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER')")
    @Operation(summary = "Get stock out alerts")
    public ResponseEntity<ApiResponse<List<Alert>>> getStockOutAlerts() {
        return ResponseEntity.ok(ApiResponse.success("Stock out alerts retrieved",
                alertService.getStockOutAlerts()));
    }

    @GetMapping("/stock-out/unread/count")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER')")
    @Operation(summary = "Unread stock-out count for nav badge")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getStockOutUnreadCount() {
        long count = alertService.getStockOutAlerts()
                .stream().filter(a -> !a.getIsRead()).count();
        return ResponseEntity.ok(ApiResponse.success("Count", Map.of("count", count)));
    }

    @PutMapping("/stock-out/read-all")
    @PreAuthorize("hasAnyAuthority('OWNER','STORE_MANAGER')")
    @Operation(summary = "Mark all stock-out alerts as read")
    public ResponseEntity<ApiResponse<String>> markAllStockOutAsRead(Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        alertService.markAllStockOutAsRead(currentUser);
        return ResponseEntity.ok(ApiResponse.success("All stock-out alerts marked as read", null));
    }
}