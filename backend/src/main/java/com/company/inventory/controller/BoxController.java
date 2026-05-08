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
public class BoxController {

    private final BoxService boxService;
    private final AuthService authService;

    @GetMapping
    @Operation(summary = "Get all boxes", description = "Retrieve all boxes")
    public ResponseEntity<ApiResponse<List<Box>>> getAllBoxes() {
        List<Box> boxes = boxService.getAllBoxes();
        return ResponseEntity.ok(ApiResponse.success("Boxes retrieved successfully", boxes));
    }

    @GetMapping("/active")
    @Operation(summary = "Get active boxes", description = "Retrieve only active boxes")
    public ResponseEntity<ApiResponse<List<Box>>> getActiveBoxes() {
        List<Box> boxes = boxService.getActiveBoxes();
        return ResponseEntity.ok(ApiResponse.success("Active boxes retrieved successfully", boxes));
    }

    @GetMapping("/rack/{rackId}")
    @Operation(summary = "Get boxes by rack", description = "Retrieve boxes for a specific rack")
    public ResponseEntity<ApiResponse<List<Box>>> getBoxesByRack(@PathVariable Long rackId) {
        List<Box> boxes = boxService.getBoxesByRack(rackId);
        return ResponseEntity.ok(ApiResponse.success("Boxes retrieved successfully", boxes));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get box by ID", description = "Retrieve a specific box by ID")
    public ResponseEntity<ApiResponse<Box>> getBoxById(@PathVariable Long id) {
        Box box = boxService.getBoxById(id);
        return ResponseEntity.ok(ApiResponse.success("Box retrieved successfully", box));
    }

    @PostMapping
    @Operation(summary = "Create box", description = "Create a new box")
    public ResponseEntity<ApiResponse<Box>> createBox(
            @RequestBody BoxRequest req,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        Box box = boxService.createBox(
                req.rackId(), req.boxNumber(), req.boxLabel(), currentUser
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Box created successfully", box));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update box", description = "Update an existing box")
    public ResponseEntity<ApiResponse<Box>> updateBox(
            @PathVariable Long id,
            @RequestBody BoxRequest req) {
        Box box = boxService.updateBox(id, req.boxNumber(), req.boxLabel());
        return ResponseEntity.ok(ApiResponse.success("Box updated successfully", box));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete box", description = "Soft delete a box")
    public ResponseEntity<ApiResponse<Void>> deleteBox(@PathVariable Long id) {
        boxService.deleteBox(id);
        return ResponseEntity.ok(ApiResponse.success("Box deleted successfully", null));
    }
}