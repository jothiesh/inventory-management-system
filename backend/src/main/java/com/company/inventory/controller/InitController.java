package com.company.inventory.controller;

import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.service.InitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/init")
@RequiredArgsConstructor
@Tag(name = "Initialization", description = "System initialization APIs")
public class InitController {

    private final InitService initService;

    @PostMapping("/all")
    @Operation(summary = "Initialize entire system", description = "Creates default users, categories, racks, and boxes")
    public ResponseEntity<ApiResponse<Map<String, Integer>>> initializeAll() {
        Map<String, Integer> result = new HashMap<>();
        
        int users = initService.initializeUsers();
        int categories = initService.initializeCategories();
        int racks = initService.initializeRacks();
        int boxes = initService.initializeBoxes();
        
        result.put("users", users);
        result.put("categories", categories);
        result.put("racks", racks);
        result.put("boxes", boxes);
        
        return ResponseEntity.ok(ApiResponse.success("System initialized successfully", result));
    }

    @PostMapping("/users")
    @Operation(summary = "Initialize users only", description = "Creates default owner and manager accounts")
    public ResponseEntity<ApiResponse<Integer>> initializeUsers() {
        int count = initService.initializeUsers();
        return ResponseEntity.ok(ApiResponse.success("Users initialized: " + count, count));
    }

    @PostMapping("/categories")
    @Operation(summary = "Initialize categories only", description = "Creates default product categories")
    public ResponseEntity<ApiResponse<Integer>> initializeCategories() {
        int count = initService.initializeCategories();
        return ResponseEntity.ok(ApiResponse.success("Categories initialized: " + count, count));
    }

    @PostMapping("/racks")
    @Operation(summary = "Initialize racks only", description = "Creates default storage racks")
    public ResponseEntity<ApiResponse<Integer>> initializeRacks() {
        int count = initService.initializeRacks();
        return ResponseEntity.ok(ApiResponse.success("Racks initialized: " + count, count));
    }

    @PostMapping("/boxes")
    @Operation(summary = "Initialize boxes only", description = "Creates default storage boxes in racks")
    public ResponseEntity<ApiResponse<Integer>> initializeBoxes() {
        int count = initService.initializeBoxes();
        return ResponseEntity.ok(ApiResponse.success("Boxes initialized: " + count, count));
    }
}
