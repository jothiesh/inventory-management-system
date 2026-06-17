package com.company.inventory.controller;

import com.company.inventory.dto.request.CreatePurchaseRequestRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.PurchaseRequest;
import com.company.inventory.entity.User;
import com.company.inventory.repository.UserRepository;
import com.company.inventory.service.PurchaseRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/purchase-requests")
@RequiredArgsConstructor
@Slf4j
public class PurchaseRequestController {

    private final PurchaseRequestService prService;
    private final UserRepository userRepository;

    private User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> {
                    log.error("Security principal extraction lookup crash error context: Active thread runtime session user matching credential name parameter strings unresolved inside tables.");
                    return new RuntimeException("User not found");
                });
    }

    // POST /api/purchase-requests
    @PostMapping
    public ResponseEntity<?> create(@RequestBody CreatePurchaseRequestRequest request) {
        log.info("REST Request received: POST /api/purchase-requests | Creating procurement request compilation payload blueprint draft tracker.");
        try {
            PurchaseRequest pr = prService.createPurchaseRequest(request, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request created: " + pr.getPrCode(), pr));
        } catch (Exception e) {
            log.error("Internal processing chain failure writing new procurement validation entries context: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests
    @GetMapping
    public ResponseEntity<?> getAll() {
        log.debug("REST Request received: GET /api/purchase-requests | Querying master listing indexes rows tracking all procurement documents.");
        try {
            return ResponseEntity.ok(ApiResponse.success("Purchase Requests", prService.getAllPurchaseRequests()));
        } catch (Exception e) {
            log.error("Failed to query full historical collections procurement dataset lines mappings: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests/{id}
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        log.debug("REST Request received: GET /api/purchase-requests/{} | Pulling concrete row sequence blueprint properties vector fields node matching target id parameter.", id);
        try {
            return ResponseEntity.ok(ApiResponse.success("Purchase Request", prService.getPurchaseRequestById(id)));
        } catch (Exception e) {
            log.error("Procurement document retrieval boundary error: Target index query trace parameter missing match from tables for ID key: {}", id);
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Not found: " + id));
        }
    }

    // PUT /api/purchase-requests/{id}/approve  — OWNER only
    @PutMapping("/{id}/approve")
    public ResponseEntity<?> approve(@PathVariable Long id) {
        log.info("REST Request received: PUT /api/purchase-requests/{}/approve | Authorization workflow signoff signature intercept endpoint hit.", id);
        try {
            PurchaseRequest pr = prService.approvePurchaseRequest(id, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request approved", pr));
        } catch (Exception e) {
            log.error("Procurement signoff execution pipeline block collapsed on exception layer context mapping index target row key {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // PUT /api/purchase-requests/{id}/reject   — OWNER only
    @PutMapping("/{id}/reject")
    public ResponseEntity<?> reject(@PathVariable Long id) {
        log.warn("REST Request received: PUT /api/purchase-requests/{}/reject | Workflow decline signature execution cancellation block intercept endpoint hit.", id);
        try {
            PurchaseRequest pr = prService.rejectPurchaseRequest(id, getCurrentUser());
            return ResponseEntity.ok(ApiResponse.success("Purchase Request rejected", pr));
        } catch (Exception e) {
            log.error("Procurement dismissal cancellation pipeline collapsed on exception layer trace processing key ID row cell reference target {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed: " + e.getMessage()));
        }
    }

    // GET /api/purchase-requests/{id}/download
    @GetMapping("/{id}/download")
    public ResponseEntity<?> downloadPdf(@PathVariable Long id) {
        log.info("REST Request received: GET /api/purchase-requests/{}/download | Generating streaming binary payload export file context matching printable document assets layout framework templates.", id);
        try {
            PurchaseRequest pr = prService.getPurchaseRequestById(id);
            byte[] pdfBytes = prService.downloadPdf(id);
            
            log.info("Flushing calculated data report file byte blocks stream to user client download buffers. Target Filename string marker designation: '\"' + {}.pdf + '\"'", pr.getPrCode());
            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_PDF)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + pr.getPrCode() + ".pdf\"")
                    .body(pdfBytes);
        } catch (Exception e) {
            log.error("Procurement document canvas compilation engine collapsed during structural processing runtime stream sequence layout for record key ID {}: ", id, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("PDF failed: " + e.getMessage()));
        }
    }
}