package com.company.inventory.dto.response;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.StockMovement;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response DTO for Stock information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StockResponse {
    
    private Long productId;
    private String productName;
    private BigDecimal totalStock;
    private String unit;
    private Integer totalLots;
    private List<LotDTO> lots;
    private List<MovementDTO> recentMovements;
    
    /**
     * Lot information DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LotDTO {
        private Long lotId;
        private String lotNumber;
        private BigDecimal remainingQuantity;
        private BigDecimal purchasePrice;
        private LocalDate purchaseDate;
        private String rackNumber;
        private String boxNumber;
        private String supplierName;
        private String status;
        
        public static LotDTO fromEntity(Lot lot) {
            return new LotDTO(
                lot.getLotId(),
                lot.getLotNumber(),
                lot.getRemainingQuantity(),
                lot.getPurchasePrice(),
                lot.getPurchaseDate(),
                lot.getRack() != null ? lot.getRack().getRackNumber() : null,
                lot.getBox() != null ? lot.getBox().getBoxNumber() : null,
                lot.getSupplier() != null ? lot.getSupplier().getSupplierName() : null,
                lot.getStatus().name()
            );
        }
    }
    
    /**
     * Stock movement DTO
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MovementDTO {
        private Long movementId;
        private String movementType;
        private String transactionType;
        private BigDecimal quantity;
        private String lotNumber;
        private String referenceNumber;
        private LocalDateTime createdAt;
        private String createdBy;
        
        public static MovementDTO fromEntity(StockMovement movement) {
            return new MovementDTO(
                movement.getMovementId(),
                movement.getMovementType().name(),
                movement.getTransactionType().name(),
                movement.getQuantity(),
                movement.getLot().getLotNumber(),
                movement.getReferenceNumber(),
                movement.getCreatedAt(),
                movement.getCreatedBy() != null ? 
                    movement.getCreatedBy().getUsername() : null
            );
        }
    }
}