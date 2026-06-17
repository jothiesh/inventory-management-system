package com.company.inventory.qc.service;

import com.company.inventory.entity.CurrentStock;
import com.company.inventory.entity.Lot;
import com.company.inventory.qc.exception.QcException;
import com.company.inventory.repository.CurrentStockRepository;
import com.company.inventory.repository.LotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Bridges QC module to the existing Lot and CurrentStock world.
 *
 *  - {@link #getLotsForBatch(Long)}   — read lots that belong to a Stock IN batch
 *  - {@link #releaseLotToStock(Lot, BigDecimal)} — push accepted qty into current_stock
 *  - {@link #writeQcOutcomeOnLot(Lot, String, BigDecimal, BigDecimal, BigDecimal, String)} — mark lot outcomes
 *
 * NOTE: This is the ONLY class in the QC module that imports from
 * com.company.inventory.entity / repository. Keeping the coupling here
 * makes the rest of the module portable.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QcStockBridge {

    private final LotRepository lotRepository;
    private final CurrentStockRepository currentStockRepository;

    /** Fetch all lots created during one Stock IN session (the QC unit of work). */
    @Transactional(readOnly = true)
    public List<Lot> getLotsForBatch(Long stockInBatchId) {
        log.trace("Bridge query index mapping execution: Fetching all active inventory lots tracking token configurations under SIB container link: {}", stockInBatchId);
        return lotRepository.findByStockInBatchId(stockInBatchId);
    }

    /**
     * Move accepted qty of a lot into current_stock.
     * If the lot was only partially accepted, also adjust lot.remainingQuantity
     * down to the accepted qty (so reports & FIFO see the right number).
     */
    @Transactional
    public void releaseLotToStock(Lot lot, BigDecimal qtyAccepted) {
        log.info("Bridge integration tunnel activated: Committing authorization stock release pipeline configurations on Lot ID: {}, Net volume released: {}", 
                lot.getLotId(), qtyAccepted);
                
        if (qtyAccepted == null || qtyAccepted.compareTo(BigDecimal.ZERO) <= 0) {
            log.debug("Release transaction bypass flag applied on target lot {}: Qty parameter weight evaluation is beneath minimum positive parameters.", lot.getLotId());
            return;
        }

        // 1) If accepted < originally purchased, scale the lot down
        BigDecimal originalPurchase = lot.getPurchaseQuantity();
        if (originalPurchase != null && qtyAccepted.compareTo(originalPurchase) < 0) {
            log.warn("Partial compliance structural balance trimming required. Scaling record bounds dimensions on Lot ID {}. [Historic Value: {}, Adjusted Value: {}]", 
                    lot.getLotId(), originalPurchase, qtyAccepted);
            lot.setInitialQuantity(qtyAccepted);
            lot.setRemainingQuantity(qtyAccepted);
            lotRepository.save(lot);
            log.info("Lot ID {} scaled down structural balance rows from {} -> {} after partial QC", lot.getLotId(), originalPurchase, qtyAccepted);
        }

        // 2) Top up current_stock for this lot (create if absent)
        log.trace("Inspecting global active inventory index current stock mappings records for lot alignment matching row cell ID: {}", lot.getLotId());
        Optional<CurrentStock> existing = currentStockRepository.findByLotLotId(lot.getLotId()).stream().findFirst();
        
        CurrentStock cs = existing.orElseGet(() -> {
            log.debug("No pre-existing current stock tracking row allocated for Lot ID {}. Spawning fresh CurrentStock persistence layer placeholder record.", lot.getLotId());
            CurrentStock fresh = new CurrentStock();
            fresh.setProduct(lot.getProduct());
            fresh.setLot(lot);
            fresh.setRack(lot.getRack());
            fresh.setBox(lot.getBox());
            fresh.setAvailableQuantity(BigDecimal.ZERO);
            fresh.setPurchasePrice(lot.getPurchasePrice());
            fresh.setPurchaseDate(lot.getPurchaseDate());
            return fresh;
        });
        
        BigDecimal newQty = (cs.getAvailableQuantity() == null ? BigDecimal.ZERO : cs.getAvailableQuantity()).add(qtyAccepted);
        cs.setAvailableQuantity(newQty);
        cs.setLastMovementDate(LocalDateTime.now());
        currentStockRepository.save(cs);

        log.info("Bridge inventory transaction committed safely. Lot ID {} structural asset released to active CurrentStock. (+{} units, new live balance tracking level: {})",
                lot.getLotId(), qtyAccepted, newQty);
    }

    /**
     * Mark a lot as cancelled — used when QC rejects or holds all qty.
     * Records the per-decision quantities directly on the Lot row so other
     * modules (reports, supplier history) can see what was rejected and why.
     */
    @Transactional
    public void writeQcOutcomeOnLot(Lot lot, String decision,
                                    BigDecimal qtyAccepted, BigDecimal qtyRejected,
                                    BigDecimal qtyHeld, String remarks) {
        log.debug("Writing immutable metrics quality assurance outcomes vectors parameters down directly to core Lot ID row index: {}", lot.getLotId());
        lot.setQcDecision(decision);
        lot.setQcQtyAccepted(qtyAccepted);
        lot.setQcQtyRejected(qtyRejected);
        lot.setQcQtyHeld(qtyHeld);
        lot.setQcRemarks(remarks);

        // If nothing was accepted, the lot is dead → mark Cancelled
        if (qtyAccepted == null || qtyAccepted.compareTo(BigDecimal.ZERO) == 0) {
            log.warn("Zero compliance release condition detected. Archiving lot node context parameters down onto lifecycle level 'CANCELLED' on tracking ID: {}", lot.getLotId());
            lot.setStatus(Lot.LotStatus.Cancelled);
            lot.setRemainingQuantity(BigDecimal.ZERO);
        }
        lotRepository.save(lot);
        log.info("Lot database profile row outcomes updated neatly. ID: {}, Decision Flag: [{}], Accepted: {}, Blocked/Rejected: {}, Retained/Held: {}",
                lot.getLotId(), decision, qtyAccepted, qtyRejected, qtyHeld);
    }

    /** Sanity check for per-item: acc + rej + held must equal received. */
    public void validateQuantityMath(BigDecimal received, BigDecimal acc, BigDecimal rej, BigDecimal held) {
        BigDecimal a = nz(acc), r = nz(rej), h = nz(held);
        BigDecimal sum = a.add(r).add(h);
        if (received == null || sum.compareTo(received) != 0) {
            log.error("Core quantity calculus boundaries discrepancy error intercepted inside verification math method layer. Expected: {}, Summary Calculations: [Acc: {}, Rej: {}, Held: {}, Sum Net Matrix: {}]", 
                    received, a, r, h, sum);
            throw QcException.invalidQuantity(
                "Quantity math invalid: received=" + received + " but accepted+rejected+held=" + sum);
        }
    }

    private BigDecimal nz(BigDecimal v) { return v == null ? BigDecimal.ZERO : v; }
}