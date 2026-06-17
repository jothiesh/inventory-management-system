package com.company.inventory.controller;

import com.company.inventory.dto.request.BoxRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Box;
import com.company.inventory.entity.User;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.BoxService;
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
@RequestMapping("/api/boxes")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Boxes", description = "Box management APIs")
@Slf4j // <-- Injected for diagnostic tracing loops
public class BoxController {

    private final BoxService boxService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Get all boxes", description = "Retrieve all boxes")
    public ResponseEntity<ApiResponse<List<Box>>> getAllBoxes() {
        log.info("REST Request received: GET /api/boxes | Fetching entire box mapping registry.");
        List<Box> boxes = boxService.getAllBoxes();
        log.debug("Successfully pulled {} box structural elements from service layer.", boxes.size());
        return ResponseEntity.ok(ApiResponse.success("Boxes retrieved successfully", boxes));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active boxes", description = "Retrieve only active boxes")
    public ResponseEntity<ApiResponse<List<Box>>> getActiveBoxes() {
        log.info("REST Request received: GET /api/boxes/active | Filtering un-decommissioned box records.");
        List<Box> boxes = boxService.getActiveBoxes();
        log.debug("Successfully pulled {} active box compartments.", boxes.size());
        return ResponseEntity.ok(ApiResponse.success("Active boxes retrieved successfully", boxes));
    }

    @GetMapping("/rack/{rackId}")
    @Operation(summary = "Get boxes by rack", description = "Retrieve boxes for a specific rack")
    public ResponseEntity<ApiResponse<List<Box>>> getBoxesByRack(@PathVariable Long rackId) {
        log.info("REST Request received: GET /api/boxes/rack/{} | Filtering box assets mapped under parent rack allocation point.", rackId);
        List<Box> boxes = boxService.getBoxesByRack(rackId);
        log.debug("Found {} storage boxes allocated to Rack context node ID: {}", boxes.size(), rackId);
        return ResponseEntity.ok(ApiResponse.success("Boxes retrieved successfully", boxes));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get box by ID", description = "Retrieve a specific box by ID")
    public ResponseEntity<ApiResponse<Box>> getBoxById(@PathVariable Long id) {
        log.info("REST Request received: GET /api/boxes/{} | Extracting unique compartment properties.", id);
        Box box = boxService.getBoxById(id);
        return ResponseEntity.ok(ApiResponse.success("Box retrieved successfully", box));
    }

    @PostMapping
    @Operation(summary = "Create box", description = "Create a new box")
    public ResponseEntity<ApiResponse<Box>> createBox(
            @RequestBody BoxRequest req,
            Authentication authentication) {
        log.info("REST Request received: POST /api/boxes | Initiating registration for new box compartment token path. Code tag: '{}', Label info: '{}'", 
                req.boxNumber(), req.boxLabel());
                
        User currentUser = authService.getCurrentUser(authentication.getName());
        log.trace("Extracted operational session context principal token username: '{}'", currentUser.getUsername());
        
        Box box = boxService.createBox(
                req.rackId(), req.boxNumber(), req.boxLabel(), currentUser
        );
        log.info("New spatial layout mapping node established successfully. Allocated entity tracking ID: {}", box.getBoxId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Box created successfully", box));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update box", description = "Update an existing box")
    public ResponseEntity<ApiResponse<Box>> updateBox(
            @PathVariable Long id,
            @RequestBody BoxRequest req) {
        log.info("REST Request received: PUT /api/boxes/{} | Injecting parameter mutations payload. Code tag target: '{}'", id, req.boxNumber());
        Box box = boxService.updateBox(id, req.boxNumber(), req.boxLabel());
        return ResponseEntity.ok(ApiResponse.success("Box updated successfully", box));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete box", description = "Soft delete a box")
    public ResponseEntity<ApiResponse<Void>> deleteBox(@PathVariable Long id) {
        log.warn("REST Request received: DELETE /api/boxes/{} | Triggering container soft decommissioning pipeline.", id);
        boxService.deleteBox(id);
        return ResponseEntity.ok(ApiResponse.success("Box deleted successfully", null));
    }
}