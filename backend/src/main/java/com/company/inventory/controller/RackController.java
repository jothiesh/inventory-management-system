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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j // <-- Injected for granular diagnostic log streams
public class RackController {

    private final RackService rackService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Get all racks", description = "Retrieve all racks")
    public ResponseEntity<ApiResponse<List<Rack>>> getAllRacks() {
        log.info("REST Request received: GET /api/racks | Fetching complete global warehouse structural framework layout map.");
        List<Rack> racks = rackService.getAllRacks();
        log.debug("Successfully pulled {} total rack layout lines from infrastructure services.", racks.size());
        return ResponseEntity.ok(ApiResponse.success("Racks retrieved successfully", racks));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active racks", description = "Retrieve only active racks")
    public ResponseEntity<ApiResponse<List<Rack>>> getActiveRacks() {
        log.info("REST Request received: GET /api/racks/active | Pulling un-archived spatial storage framework items.");
        List<Rack> racks = rackService.getActiveRacks();
        log.debug("Found {} operational un-decommissioned warehouse frameworks.", racks.size());
        return ResponseEntity.ok(ApiResponse.success("Active racks retrieved successfully", racks));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get rack by ID", description = "Retrieve a specific rack by ID")
    public ResponseEntity<ApiResponse<Rack>> getRackById(@PathVariable Long id) {
        log.info("REST Request received: GET /api/racks/{} | Resolving standalone specific framework row element.", id);
        Rack rack = rackService.getRackById(id);
        return ResponseEntity.ok(ApiResponse.success("Rack retrieved successfully", rack));
    }

    @PostMapping
    @Operation(summary = "Create rack", description = "Create a new rack")
    public ResponseEntity<ApiResponse<Rack>> createRack(
            @RequestBody RackRequest req,
            Authentication authentication) {
        log.info("REST Request received: POST /api/racks | Spawning a new spatial hardware configuration structure. Alphanumeric Code: '{}', Designation: '{}'", 
                req.rackNumber(), req.rackName());
                
        User currentUser = authService.getCurrentUser(authentication.getName());
        log.trace("Extracted matching workflow user session key principal username context: '{}'", currentUser.getUsername());
        
        Rack rack = rackService.createRack(
                req.rackNumber(), req.rackName(), req.location(), req.capacity(), currentUser
        );
        log.info("New storage framework successfully persisted to schema spaces. Allocated entry key ID index: {}", rack.getRackId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Rack created successfully", rack));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update rack", description = "Update an existing rack")
    public ResponseEntity<ApiResponse<Rack>> updateRack(
            @PathVariable Long id,
            @RequestBody RackRequest req) {
        log.info("REST Request received: PUT /api/racks/{} | Processing structural updates overlay attributes payload. Alphanumeric sequence code target: '{}'", id, req.rackNumber());
        Rack rack = rackService.updateRack(
                id, req.rackNumber(), req.rackName(), req.location(), req.capacity()
        );
        log.info("Framework boundary metrics modified successfully inside database layers for ID: {}", id);
        return ResponseEntity.ok(ApiResponse.success("Rack updated successfully", rack));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete rack", description = "Soft delete a rack")
    public ResponseEntity<ApiResponse<Void>> deleteRack(@PathVariable Long id) {
        log.warn("REST Request received: DELETE /api/racks/{} | Commencing warehouse space soft decommissioning logic workflow path.", id);
        rackService.deleteRack(id);
        log.info("Soft-decommission process successfully processed on core database indices framework configuration node target ID: {}", id);
        return ResponseEntity.ok(ApiResponse.success("Rack deleted successfully", null));
    }
}