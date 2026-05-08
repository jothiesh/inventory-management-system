package com.company.inventory.controller;

import com.company.inventory.dto.request.CreatePurchaseOrderRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.PurchaseOrder;
import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import com.company.inventory.service.PurchaseOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
@RequiredArgsConstructor
public class PurchaseOrderController {

    private final PurchaseOrderService poService;
    private final UserRepository userRepository;

    // ── Get logged-in User from JWT username ─────────────────────────
    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = auth.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));
    }

    // ── DEBUG — hit this first to verify auth is working ────────────
    // URL: GET /api/purchase-orders/debug-auth
    // Remove after confirming roles work
    @GetMapping("/debug-auth")
    public ResponseEntity<?> debugAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ResponseEntity.ok(Map.of(
            "username", auth.getName(),
            "authorities", auth.getAuthorities().toString(),
            "isAuthenticated", auth.isAuthenticated()
        ));
    }

    // ── CREATE ───────────────────────────────────────────────────────
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreatePurchaseOrderRequest request) {
        try {
            User currentUser = getCurrentUser();
            PurchaseOrder po = poService.createPurchaseOrder(request, currentUser);
            return ResponseEntity.ok(
                ApiResponse.success("Purchase Order created: " + po.getPoCode(), po)
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // ── GET ALL ──────────────────────────────────────────────────────
    @GetMapping
    public ResponseEntity<?> getAll() {
        try {
            List<PurchaseOrder> orders = poService.getAllPurchaseOrders();
            return ResponseEntity.ok(ApiResponse.success("Purchase Orders", orders));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // ── GET BY ID ────────────────────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(
                ApiResponse.success("Purchase Order", poService.getPurchaseOrderById(id))
            );
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("PO not found: " + id));
        }
    }

    // ── DOWNLOAD PDF ─────────────────────────────────────────────────
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadPdf(@PathVariable Long id) {
        try {
            PurchaseOrder po = poService.getPurchaseOrderById(id);
            byte[] pdfBytes = poService.downloadPdf(id);
            String filename = po.getPoCode() + ".pdf";
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + filename + "\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("PDF failed: " + e.getMessage()));
        }
    }
}