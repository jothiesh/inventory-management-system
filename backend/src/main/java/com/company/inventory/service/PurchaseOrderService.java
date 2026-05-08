package com.company.inventory.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.inventory.dto.request.CreatePurchaseOrderRequest;
import com.company.inventory.dto.request.PurchaseOrderItemRequest;
import com.company.inventory.entity.PurchaseOrder;
import com.company.inventory.entity.PurchaseOrderItem;
import com.company.inventory.entity.User;
import com.company.inventory.repository.PurchaseOrderRepository;
import com.company.inventory.util.AmountToWordsUtil;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository poRepository;
    private final PurchaseOrderPdfService pdfService;

    // ── CREATE PO ────────────────────────────────────────────────────
    @Transactional
    public PurchaseOrder createPurchaseOrder(CreatePurchaseOrderRequest request, User createdBy) {

        // 1. Generate PO code → TT.PO-066
        String poCode = generatePoCode();

        // 2. Build items + calculate totals
        List<PurchaseOrderItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        int slNo = 1;

        for (PurchaseOrderItemRequest itemReq : request.getItems()) {
            BigDecimal lineTotal = itemReq.getRate()
                    .multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            PurchaseOrderItem item = PurchaseOrderItem.builder()
                    .slNo(slNo++)
                    .hsnCode(itemReq.getHsnCode())
                    .description(itemReq.getDescription())
                    .quantity(itemReq.getQuantity())
                    .uom(itemReq.getUom())
                    .rate(itemReq.getRate())
                    .totalAmount(lineTotal)
                    .build();

            items.add(item);
            totalAmount = totalAmount.add(lineTotal);
        }

        // 3. Convert total to words
        String totalInWords = AmountToWordsUtil.convert(totalAmount);

        // 4. Build & save PO
        PurchaseOrder po = PurchaseOrder.builder()
                .poCode(poCode)
                .poDate(LocalDate.now())
                .totalAmount(totalAmount)
                .totalInWords(totalInWords)
                .deliveryFrom(request.getDeliveryFrom())
                .deliveryTo(request.getDeliveryTo())
                .paymentTerms(request.getPaymentTerms())
                .notes(request.getNotes())
                .items(items)
                .createdBy(createdBy)
                .build();

        // Link items back to PO
        items.forEach(item -> item.setPurchaseOrder(po));

        return poRepository.save(po);
    }

    // ── GET ALL ──────────────────────────────────────────────────────
    public List<PurchaseOrder> getAllPurchaseOrders() {
        return poRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── GET BY ID ────────────────────────────────────────────────────
    public PurchaseOrder getPurchaseOrderById(Long id) {
        return poRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PO not found: " + id));
    }

    // ── DOWNLOAD PDF ─────────────────────────────────────────────────
    public byte[] downloadPdf(Long id) throws Exception {
        PurchaseOrder po = getPurchaseOrderById(id);
        return pdfService.generatePdf(po);
    }

    // ── PO CODE GENERATOR ────────────────────────────────────────────
    // Format: TT.PO-066 (sequential, 3-digit padded)
    private String generatePoCode() {
        Long maxId = poRepository.findMaxId();
        long nextNumber = maxId + 1;
        return String.format("TT.PO-%03d", nextNumber);
    }
}