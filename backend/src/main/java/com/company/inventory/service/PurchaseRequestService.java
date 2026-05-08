package com.company.inventory.service;

import com.company.inventory.dto.request.CreatePurchaseRequestRequest;
import com.company.inventory.dto.request.PurchaseRequestItemRequest;
import com.company.inventory.entity.PurchaseRequest;
import com.company.inventory.entity.PurchaseRequest.PRStatus;
import com.company.inventory.entity.PurchaseRequestItem;
import com.company.inventory.entity.User;
import com.company.inventory.repository.PurchaseRequestRepository;
import com.company.inventory.util.AmountToWordsUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PurchaseRequestService {

    private final PurchaseRequestRepository prRepository;
    private final PurchaseRequestPdfService pdfService;

    // ── PR Code: TT.PR-01-202604091209 ───────────────────────────────
    private String generatePrCode() {
        Long maxId = prRepository.findMaxId();
        long nextNumber = maxId + 1;
        String datetime = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        return String.format("TT.PR-%02d-%s", nextNumber, datetime);
    }

    // ── CREATE ───────────────────────────────────────────────────────
    @Transactional
    public PurchaseRequest createPurchaseRequest(
            CreatePurchaseRequestRequest request, User createdBy) {

        String prCode = generatePrCode();

        List<PurchaseRequestItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        int slNo = 1;

        for (PurchaseRequestItemRequest itemReq : request.getItems()) {

            if (itemReq.getQuantity() == null || itemReq.getQuantity() > 999999) {
                throw new RuntimeException("Quantity must be max 6 digits (999999)");
            }

            BigDecimal rate = itemReq.getRate() != null
                    ? itemReq.getRate() : BigDecimal.ZERO;

            BigDecimal lineTotal = rate.multiply(BigDecimal.valueOf(itemReq.getQuantity()));

            PurchaseRequestItem item = PurchaseRequestItem.builder()
                    .slNo(slNo++)
                    .partNo(itemReq.getPartNo())
                    .description(itemReq.getDescription())
                    .quantity(itemReq.getQuantity())
                    .remark(itemReq.getRemark())
                    .rate(rate)
                    .totalAmount(lineTotal)
                    .build();

            items.add(item);
            totalAmount = totalAmount.add(lineTotal);
        }

        String totalInWords = AmountToWordsUtil.convert(totalAmount);

        PurchaseRequest pr = PurchaseRequest.builder()
                .prCode(prCode)
                .prDate(LocalDate.now())
                .status(PRStatus.PENDING)
                .totalAmount(totalAmount)
                .totalInWords(totalInWords)
                .notes(request.getNotes())
                .items(items)
                .createdBy(createdBy)
                .build();

        items.forEach(item -> item.setPurchaseRequest(pr));

        return prRepository.save(pr);
    }

    // ── APPROVE ──────────────────────────────────────────────────────
    @Transactional
    public PurchaseRequest approvePurchaseRequest(Long id, User approvedBy) {
        PurchaseRequest pr = getPurchaseRequestById(id);
        pr.setStatus(PRStatus.APPROVED);
        pr.setApprovedBy(approvedBy);
        pr.setApprovedAt(LocalDateTime.now());
        return prRepository.save(pr);
    }

    // ── REJECT ───────────────────────────────────────────────────────
    @Transactional
    public PurchaseRequest rejectPurchaseRequest(Long id, User rejectedBy) {
        PurchaseRequest pr = getPurchaseRequestById(id);
        pr.setStatus(PRStatus.REJECTED);
        pr.setApprovedBy(rejectedBy);
        pr.setApprovedAt(LocalDateTime.now());
        return prRepository.save(pr);
    }

    // ── GET ALL ──────────────────────────────────────────────────────
    public List<PurchaseRequest> getAllPurchaseRequests() {
        return prRepository.findAllByOrderByCreatedAtDesc();
    }

    // ── GET BY ID ────────────────────────────────────────────────────
    public PurchaseRequest getPurchaseRequestById(Long id) {
        return prRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Purchase Request not found: " + id));
    }

    // ── DOWNLOAD PDF ─────────────────────────────────────────────────
    public byte[] downloadPdf(Long id) throws Exception {
        PurchaseRequest pr = getPurchaseRequestById(id);
        return pdfService.generatePdf(pr);
    }
}