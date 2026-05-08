package com.company.inventory.controller;

import com.company.inventory.dto.request.RackRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Rack;
import com.company.inventory.entity.User;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.RackService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/racks")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Racks", description = "Rack management APIs")
public class RackController {

    private final RackService rackService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Get all racks", description = "Retrieve all racks")
    public ResponseEntity<ApiResponse<List<Rack>>> getAllRacks() {
        List<Rack> racks = rackService.getAllRacks();
        return ResponseEntity.ok(ApiResponse.success("Racks retrieved successfully", racks));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active racks", description = "Retrieve only active racks")
    public ResponseEntity<ApiResponse<List<Rack>>> getActiveRacks() {
        List<Rack> racks = rackService.getActiveRacks();
        return ResponseEntity.ok(ApiResponse.success("Active racks retrieved successfully", racks));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get rack by ID", description = "Retrieve a specific rack by ID")
    public ResponseEntity<ApiResponse<Rack>> getRackById(@PathVariable Long id) {
        Rack rack = rackService.getRackById(id);
        return ResponseEntity.ok(ApiResponse.success("Rack retrieved successfully", rack));
    }

    @PostMapping
    @Operation(summary = "Create rack", description = "Create a new rack")
    public ResponseEntity<ApiResponse<Rack>> createRack(
            @RequestBody RackRequest req,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        Rack rack = rackService.createRack(
                req.rackNumber(), req.rackName(), req.location(), req.capacity(), currentUser
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Rack created successfully", rack));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update rack", description = "Update an existing rack")
    public ResponseEntity<ApiResponse<Rack>> updateRack(
            @PathVariable Long id,
            @RequestBody RackRequest req) {
        Rack rack = rackService.updateRack(
                id, req.rackNumber(), req.rackName(), req.location(), req.capacity()
        );
        return ResponseEntity.ok(ApiResponse.success("Rack updated successfully", rack));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete rack", description = "Soft delete a rack")
    public ResponseEntity<ApiResponse<Void>> deleteRack(@PathVariable Long id) {
        rackService.deleteRack(id);
        return ResponseEntity.ok(ApiResponse.success("Rack deleted successfully", null));
    }
}