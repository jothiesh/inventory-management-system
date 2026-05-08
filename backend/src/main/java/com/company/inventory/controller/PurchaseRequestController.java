package com.company.inventory.controller;

import com.company.inventory.dto.request.CreatePurchaseRequestRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.PurchaseRequest;
import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import com.company.inventory.service.PurchaseRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-requests")
@RequiredArgsConstructor
public class PurchaseRequestController {

    private final PurchaseRequestService prService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    // POST /api/purchase-requests
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreatePurchaseRequestRequest request) {
        try {
            PurchaseRequest pr = prService.createPurchaseRequest(request, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request created: " + pr.getPrCode(), pr));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests
    @GetMapping
    public ResponseEntity<?> getAll() {
        try {
            return ResponseEntity.ok(ApiResponse.success("Purchase Requests", prService.getAllPurchaseRequests()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(ApiResponse.success("Purchase Request", prService.getPurchaseRequestById(id)));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Not found: " + id));
        }
    }

    // PUT /api/purchase-requests/{id}/approve  — OWNER only
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        try {
            PurchaseRequest pr = prService.approvePurchaseRequest(id, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request approved", pr));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // PUT /api/purchase-requests/{id}/reject  — OWNER only
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        try {
            PurchaseRequest pr = prService.rejectPurchaseRequest(id, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request rejected", pr));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests/{id}/download
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadPdf(@PathVariable Long id) {
        try {
            PurchaseRequest pr = prService.getPurchaseRequestById(id);
            byte[] pdfBytes = prService.downloadPdf(id);
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + pr.getPrCode() + ".pdf\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("PDF failed: " + e.getMessage()));
        }
    }
}