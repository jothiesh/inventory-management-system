package com.company.inventory.service;

import com.company.inventory.entity.Lot;
import com.company.inventory.entity.StockMovement;
import com.company.inventory.repository.LotRepository;
import com.company.inventory.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class DeadStockService {

    private final LotRepository lotRepository;
    private final StockMovementRepository movementRepository;

    // ============================================================
    // THRESHOLDS — change here only, applies everywhere
    // ============================================================

    // DEAD STOCK threshold
    // CURRENT CLIENT REQUIREMENT: 3 months
    // FUTURE (when client upgrades): uncomment 6, comment 3
    // private static final int DEAD_STOCK_MONTHS = 6;
    private static final int DEAD_STOCK_MONTHS = 3;

    // SLOW MOVING threshold (lower bound)
    // CURRENT CLIENT REQUIREMENT: 1 month
    // FUTURE (when client upgrades): uncomment 3, comment 1
    // private static final int SLOW_MOVING_MONTHS = 3;
    private static final int SLOW_MOVING_MONTHS = 1;

    // Slow moving upper bound = DEAD_STOCK_MONTHS (auto-linked, don't change separately)

    // ============================================================
    // DEAD STOCK REPORT
    // Lots with NO movement for DEAD_STOCK_MONTHS+ months
    // Current: 3 months | Future: 6 months
    // ============================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getDeadStockReport() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate deadStockCutoff = LocalDate.now().minusMonths(DEAD_STOCK_MONTHS);

        List<Lot> activeLots = getActiveLots();

        for (Lot lot : activeLots) {
            try {
                LocalDate lastMovement = resolveLastMovementDate(lot);
                if (lastMovement == null) continue;

                // Dead stock: no movement since cutoff date
                if (lastMovement.isBefore(deadStockCutoff)) {
                    result.add(buildLotReport(lot, lastMovement));
                }
            } catch (Exception e) {
                log.error("Dead stock - error processing lot {}: {}", lot.getLotId(), e.getMessage());
            }
        }

        // Sort: most months inactive first (worst offenders on top)
        result.sort((a, b) -> Long.compare(
                (Long) b.get("monthsNoMovement"),
                (Long) a.get("monthsNoMovement")
        ));

        log.info("Dead stock report: {} lots found (threshold: {}+ months)",
                result.size(), DEAD_STOCK_MONTHS);
        return result;
    }

    // ============================================================
    // SLOW MOVING STOCK REPORT
    // Lots with NO movement between SLOW_MOVING_MONTHS and DEAD_STOCK_MONTHS
    // Current: 1 month to 3 months | Future: 3 months to 6 months
    // ============================================================
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSlowMovingReport() {
        List<Map<String, Object>> result = new ArrayList<>();
        LocalDate slowMovingCutoff = LocalDate.now().minusMonths(SLOW_MOVING_MONTHS);
        LocalDate deadStockCutoff  = LocalDate.now().minusMonths(DEAD_STOCK_MONTHS);

        List<Lot> activeLots = getActiveLots();

        for (Lot lot : activeLots) {
            try {
                LocalDate lastMovement = resolveLastMovementDate(lot);
                if (lastMovement == null) continue;

                // Slow moving: between slow_moving cutoff and dead_stock cutoff
                // i.e. no movement for 1–3 months (not yet dead stock)
                boolean olderThanSlowMoving = lastMovement.isBefore(slowMovingCutoff);
                boolean notYetDeadStock     = !lastMovement.isBefore(deadStockCutoff);

                if (olderThanSlowMoving && notYetDeadStock) {
                    result.add(buildLotReport(lot, lastMovement));
                }
            } catch (Exception e) {
                log.error("Slow moving - error processing lot {}: {}", lot.getLotId(), e.getMessage());
            }
        }

        // Sort: most months inactive first
        result.sort((a, b) -> Long.compare(
                (Long) b.get("monthsNoMovement"),
                (Long) a.get("monthsNoMovement")
        ));

        log.info("Slow moving report: {} lots found (threshold: {}-{} months)",
                result.size(), SLOW_MOVING_MONTHS, DEAD_STOCK_MONTHS);
        return result;
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private List<Lot> getActiveLots() {
        return lotRepository.findAll().stream()
                .filter(lot -> lot.getStatus() == Lot.LotStatus.Active
                        && lot.getRemainingQuantity().compareTo(BigDecimal.ZERO) > 0)
                .toList();
    }

    /**
     * Resolve the reference date for a lot.
     * Priority: last stock movement date → purchase date (fallback if never moved)
     */
    private LocalDate resolveLastMovementDate(Lot lot) {
        try {
            Optional<StockMovement> lastMovement =
                    movementRepository.findTopByLotLotIdOrderByCreatedAtDesc(lot.getLotId());

            if (lastMovement.isPresent()) {
                LocalDateTime movementTime = lastMovement.get().getCreatedAt();
                return movementTime != null ? movementTime.toLocalDate() : lot.getPurchaseDate();
            }
            // Never moved — use purchase date as reference
            return lot.getPurchaseDate();
        } catch (Exception e) {
            log.error("Error fetching last movement for lot {}: {}", lot.getLotId(), e.getMessage());
            return lot.getPurchaseDate();
        }
    }

    /**
     * Build the flat map response for a lot entry (used by both reports)
     */
    private Map<String, Object> buildLotReport(Lot lot, LocalDate lastMovementDate) {
        BigDecimal blockedValue = lot.getRemainingQuantity().multiply(lot.getPurchasePrice());
        long monthsInactive = ChronoUnit.MONTHS.between(lastMovementDate, LocalDate.now());

        Map<String, Object> item = new HashMap<>();

        // Lot info
        item.put("lotNumber",          lot.getLotNumber());
        item.put("remainingQuantity",  lot.getRemainingQuantity());
        item.put("purchasePrice",      lot.getPurchasePrice());
        item.put("purchaseDate",       lot.getPurchaseDate());
        item.put("lastMovementDate",   lastMovementDate);
        item.put("blockedValue",       blockedValue);
        item.put("monthsNoMovement",   monthsInactive);
        item.put("supplierName",       lot.getSupplier() != null
                ? lot.getSupplier().getSupplierName() : "Unknown");

        // Location info (important for electronics warehouse)
        item.put("rackNumber", lot.getRack() != null ? lot.getRack().getRackNumber() : "—");
        item.put("boxNumber",  lot.getBox()  != null ? lot.getBox().getBoxNumber()   : "—");

        // Product info — flat keys for frontend
        if (lot.getProduct() != null) {
            item.put("partNumber",   lot.getProduct().getPartNumber());
            item.put("description",  lot.getProduct().getDescription());
            item.put("categoryName", lot.getProduct().getCategory() != null
                    ? lot.getProduct().getCategory().getCategoryName() : "Uncategorized");
        } else {
            item.put("partNumber",   "N/A");
            item.put("description",  "");
            item.put("categoryName", "Uncategorized");
        }

        return item;
    }
}