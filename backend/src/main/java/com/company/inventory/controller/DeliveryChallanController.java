package com.company.inventory.controller;


import com.company.inventory.dto.request.AssemblyReceivedRequest;
import com.company.inventory.dto.request.CreateDeliveryChallanRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.dto.response.DeliveryChallanResponse;
import com.company.inventory.entity.DeliveryChallanEvent;
import com.company.inventory.entity.User;
import com.company.inventory.exception.InsufficientStockException;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.DeliveryChallanService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/delivery-challans")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Delivery Challan", description = "Job-work delivery challan APIs")
@Slf4j
public class DeliveryChallanController {

    private final DeliveryChallanService service;
    private final AuthService authService;

    // ── CREATE (components issued from stock, FIFO JobWork OUT) ──
    @PostMapping
    @Operation(summary = "Create a delivery challan (stock is issued immediately)")
    public ResponseEntity<ApiResponse<DeliveryChallanResponse>> create(
            @RequestBody CreateDeliveryChallanRequest request,
            Authentication authentication) {
        log.info("POST /api/delivery-challans | items={}",
                request.getItems() != null ? request.getItems().size() : 0);
        User currentUser = authService.getCurrentUser(authentication.getName());
        try {
            DeliveryChallanResponse dc = service.create(request, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Delivery Challan created", dc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        } catch (InsufficientStockException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── LIST (optional ?status=DRAFT|SENT|ASSEMBLY_RECEIVED|CLOSED|ALL) ──
    @GetMapping
    @Operation(summary = "List delivery challans")
    public ResponseEntity<ApiResponse<List<DeliveryChallanResponse>>> list(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(ApiResponse.success("Delivery challans retrieved",
                service.list(status)));
    }

    // ── DETAIL ──
    @GetMapping("/{id}")
    @Operation(summary = "Get delivery challan by id (with items)")
    public ResponseEntity<ApiResponse<DeliveryChallanResponse>> detail(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Delivery challan retrieved",
                    service.detail(id)));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── TIMELINE ──
    @GetMapping("/{id}/timeline")
    @Operation(summary = "Timeline events of a delivery challan")
    public ResponseEntity<ApiResponse<List<DeliveryChallanEvent>>> timeline(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Timeline retrieved", service.timeline(id)));
    }

    // ── SEND ──
    @PostMapping("/{id}/send")
    @Operation(summary = "Mark challan as sent to supplier")
    public ResponseEntity<ApiResponse<DeliveryChallanResponse>> send(@PathVariable Long id) {
        log.info("POST /api/delivery-challans/{}/send", id);
        try {
            return ResponseEntity.ok(ApiResponse.success("Challan marked as sent", service.send(id)));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── ASSEMBLY RECEIVED (creates PENDING_QC batch) ──
    @PostMapping("/{id}/assembly-received")
    @Operation(summary = "Record the finished assembly received back from the supplier")
    public ResponseEntity<ApiResponse<DeliveryChallanResponse>> assemblyReceived(
            @PathVariable Long id,
            @RequestBody AssemblyReceivedRequest request,
            Authentication authentication) {
        log.info("POST /api/delivery-challans/{}/assembly-received", id);
        User currentUser = authService.getCurrentUser(authentication.getName());
        try {
            return ResponseEntity.ok(ApiResponse.success("Assembly received — batch sent to QC queue",
                    service.assemblyReceived(id, request, currentUser)));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        }
    }

    // ── CLOSE ──
    @PostMapping("/{id}/close")
    @Operation(summary = "Close the challan (job work cycle complete)")
    public ResponseEntity<ApiResponse<DeliveryChallanResponse>> close(
            @PathVariable Long id,
            @RequestParam(required = false) String remarks) {
        log.info("POST /api/delivery-challans/{}/close", id);
        try {
            return ResponseEntity.ok(ApiResponse.success("Challan closed", service.close(id, remarks)));
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(ApiResponse.error(e.getMessage()));
        }
    }
}
