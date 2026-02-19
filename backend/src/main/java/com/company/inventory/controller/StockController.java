package com.company.inventory.controller;

import com.company.inventory.dto.request.StockInRequest;
import com.company.inventory.dto.request.StockOutRequest;
import com.company.inventory.dto.response.ApiResponse;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.entity.User;
import com.company.inventory.service.AuthService;
import com.company.inventory.service.LotService;
import com.company.inventory.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/stock")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Stock", description = "Stock management APIs")
public class StockController {

    private final StockService stockService;
    private final LotService lotService;
    private final AuthService authService;

    @PostMapping("/in")
    @Operation(summary = "Stock IN", description = "Add stock (Purchase entry)")
    public ResponseEntity<ApiResponse<Lot>> stockIn(
            @Valid @RequestBody StockInRequest request,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        Lot lot = stockService.stockIn(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Stock added successfully", lot));
    }

    @PostMapping("/out")
    @Operation(summary = "Stock OUT", description = "Issue stock (Sale/Production/Damage/Scrap)")
    public ResponseEntity<ApiResponse<String>> stockOut(
            @Valid @RequestBody StockOutRequest request,
            Authentication authentication) {
        User currentUser = authService.getCurrentUser(authentication.getName());
        stockService.stockOut(request, currentUser);
        return ResponseEntity.ok(ApiResponse.success("Stock issued successfully", null));
    }

    @GetMapping("/product/{productId}")
    @Operation(summary = "Get current stock", description = "Get current stock quantity for a product")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCurrentStock(@PathVariable Long productId) {
        BigDecimal currentStock = stockService.getCurrentStock(productId);
        List<Lot> lots = lotService.getActiveLotsByProduct(productId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("totalStock", currentStock);
        response.put("lots", lots);
        
        return ResponseEntity.ok(ApiResponse.success("Current stock retrieved successfully", response));
    }

    @GetMapping("/lots/product/{productId}")
    @Operation(summary = "Get lots by product", description = "Get all lots for a product")
    public ResponseEntity<ApiResponse<List<Lot>>> getLotsByProduct(@PathVariable Long productId) {
        List<Lot> lots = lotService.getLotsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success("Lots retrieved successfully", lots));
    }

    @GetMapping("/lot/{lotId}")
    @Operation(summary = "Get lot by ID", description = "Get lot details by ID")
    public ResponseEntity<ApiResponse<Lot>> getLotById(@PathVariable Long lotId) {
        Lot lot = lotService.getLotById(lotId);
        return ResponseEntity.ok(ApiResponse.success("Lot retrieved successfully", lot));
    }

    @GetMapping("/movements/product/{productId}")
    @Operation(summary = "Get stock movements by product", description = "Get all stock movements for a product")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getMovementsByProduct(@PathVariable Long productId) {
        List<StockMovement> movements = stockService.getMovementsByProduct(productId);
        return ResponseEntity.ok(ApiResponse.success("Stock movements retrieved successfully", movements));
    }

    @GetMapping("/movements/lot/{lotId}")
    @Operation(summary = "Get stock movements by lot", description = "Get all stock movements for a lot")
    public ResponseEntity<ApiResponse<List<StockMovement>>> getMovementsByLot(@PathVariable Long lotId) {
        List<StockMovement> movements = stockService.getMovementsByLot(lotId);
        return ResponseEntity.ok(ApiResponse.success("Stock movements retrieved successfully", movements));
    }
}