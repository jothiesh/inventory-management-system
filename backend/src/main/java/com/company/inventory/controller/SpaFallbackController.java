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

    // Supplier detail page: /suppliers/1, /suppliers/2 etc
    @GetMapping("/suppliers/{id:[0-9]+}")
    public String supplierDetail() {
        return "forward:/index.html";
    }

    // Purchase order detail
    @GetMapping("/purchase-orders/{id:[0-9]+}")
    public String purchaseOrderDetail() {
        return "forward:/index.html";
    }

    // Purchase request detail
    @GetMapping("/purchase-requests/{id:[0-9]+}")
    public String purchaseRequestDetail() {
        return "forward:/index.html";
    }
}