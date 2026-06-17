package com.company.inventory.controller;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards all React Router dynamic paths (with IDs) to index.html.
 * Static paths are handled by WebConfig.addViewControllers().
 * API paths (/api/**) are handled by @RestController beans — NOT here.
 */
@Controller
public class SpaFallbackController {

    // ─── Dynamic ID routes ────────────────────────────────────────
    @GetMapping("/suppliers/{id:[0-9]+}")
    public String supplierDetail() { return "forward:/index.html"; }

    @GetMapping("/purchase-orders/{id:[0-9]+}")
    public String purchaseOrderDetail() { return "forward:/index.html"; }

    @GetMapping("/purchase-requests/{id:[0-9]+}")
    public String purchaseRequestDetail() { return "forward:/index.html"; }

    @GetMapping("/qc/batches/{id:[0-9]+}")
    public String qcBatchDetail() { return "forward:/index.html"; }

    @GetMapping("/qc/inspection/{batchId:[0-9]+}")
    public String qcInspectionForm() { return "forward:/index.html"; }

    // ─── QC static routes ─────────────────────────────────────────
    @GetMapping("/qc/approved")
    public String qcApproved() { return "forward:/index.html"; }

    @GetMapping("/qc/rejected")
    public String qcRejected() { return "forward:/index.html"; }

    @GetMapping("/qc/history")
    public String qcHistory() { return "forward:/index.html"; }

    @GetMapping("/qc/dashboard")
    public String qcDashboard() { return "forward:/index.html"; }

    @GetMapping("/qc/queue")
    public String qcQueue() { return "forward:/index.html"; }

    @GetMapping("/qc/alerts")
    public String qcAlerts() { return "forward:/index.html"; }

    @GetMapping("/qc/templates")
    public String qcTemplates() { return "forward:/index.html"; }

    // ─── Stock OUT routes ─────────────────────────────────────────
    @GetMapping("/stock-out")
    public String stockOut() { return "forward:/index.html"; }

    @GetMapping("/stock-out/history")
    public String stockOutHistory() { return "forward:/index.html"; }

    // ─── Stock IN routes ──────────────────────────────────────────
    @GetMapping("/stock-in")
    public String stockIn() { return "forward:/index.html"; }

    @GetMapping("/stock-in/rejected")
    public String stockInRejected() { return "forward:/index.html"; }

    // ─── Delivery Challan ─────────────────────────────────────────  ← NEW
    @GetMapping("/delivery-challan")
    public String deliveryChallan() { return "forward:/index.html"; }
}