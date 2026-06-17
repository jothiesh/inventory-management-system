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
import lombok.extern.slf4j.Slf4j;
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
@Slf4j
public class PurchaseRequestService {

    private final PurchaseRequestRepository prRepository;
    private final PurchaseRequestPdfService pdfService;

    private String generatePrCode() {
        Long maxId = prRepository.findMaxId();
        long nextNumber = maxId + 1;
        String datetime = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmm"));
        return String.format("TT.PR-%02d-%s", nextNumber, datetime);
    }

    @Transactional
    public PurchaseRequest createPurchaseRequest(CreatePurchaseRequestRequest request, User createdBy) {
        log.info("Initiating Procurement Request drafting procedure pipeline block. Operator User Account Reference ID: {}", 
                createdBy != null ? createdBy.getUserId() : "SYSTEM");
                
        String prCode = generatePrCode();
        log.debug("Generated structural cryptographic compliance tracking document number token identifier index: {}", prCode);

        List<PurchaseRequestItem> items = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;
        int slNo = 1;

        for (PurchaseRequestItemRequest itemReq : request.getItems()) {
            if (itemReq.getQuantity() == null || itemReq.getQuantity() > 999999) {
                log.error("Procurement operation denied: Row element index item '{}' specifies extreme quantity overflow bounds parameters.", itemReq.getPartNo());
                throw new RuntimeException("Quantity must be max 6 digits (999999)");
            }

            BigDecimal rate = itemReq.getRate() != null ? itemReq.getRate() : BigDecimal.ZERO;
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
        log.debug("Compiling ledger financial valuation fields. Net Request Cumulative Worth: {} INR (Text Translation: '{}')", totalAmount, totalInWords);

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
        PurchaseRequest persistedPr = prRepository.save(pr);
        
        log.info("Procurement Request document successfully processed and saved. Database Record Entity ID: {}, Document Token String: '{}'", 
                persistedPr.getId(), persistedPr.getPrCode());
        return persistedPr;
    }

    @Transactional
    public PurchaseRequest approvePurchaseRequest(Long id, User approvedBy) {
        log.info("Executing workflow transaction authorization signature sequence: Approving document record ID: {}", id);
        PurchaseRequest pr = getPurchaseRequestById(id);
        
        pr.setStatus(PRStatus.APPROVED);
        pr.setApprovedBy(approvedBy);
        pr.setApprovedAt(LocalDateTime.now());
        
        log.info("Procurement Document '{}' status flag modified successfully to state level 'APPROVED'", pr.getPrCode());
        return prRepository.save(pr);
    }

    @Transactional
    public PurchaseRequest rejectPurchaseRequest(Long id, User rejectedBy) {
        log.warn("Executing workflow cancellation transaction signoff routine: Rejecting document data row reference target ID: {}", id);
        PurchaseRequest pr = getPurchaseRequestById(id);
        
        pr.setStatus(PRStatus.REJECTED);
        pr.setApprovedBy(rejectedBy);
        pr.setApprovedAt(LocalDateTime.now());
        
        log.info("Procurement Document '{}' status flag flipped permanently to state criteria: 'REJECTED'", pr.getPrCode());
        return prRepository.save(pr);
    }

    public List<PurchaseRequest> getAllPurchaseRequests() {
        log.debug("Querying master logs repositories to capture historical structural layout records listings data for all procurement items entries.");
        return prRepository.findAllByOrderByCreatedAtDesc();
    }

    public PurchaseRequest getPurchaseRequestById(Long id) {
        log.debug("Querying repository matching target procurement document identifier data trace index node tag value: {}", id);
        return prRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Resource verification search error: Identification sequence key lookup mapping context mismatch mapping on index target: {}", id);
                    return new RuntimeException("Purchase Request not found: " + id);
                });
    }

    public byte[] downloadPdf(Long id) throws Exception {
        log.info("Processing streaming data conversion capture export generation operations request: Generating localized PDF document structure mapping binary block stream for request token layout context entity index ID: {}", id);
        PurchaseRequest pr = getPurchaseRequestById(id);
        
        long calculationStartTimeStamp = System.currentTimeMillis();
        byte[] pdfBytes = pdfService.generatePdf(pr);
        log.debug("Itext core canvas rendering loop finished layout execution thread paths mapping operations block matrix data processing smoothly. Calculated execution process running block timeline: {} ms", 
                (System.currentTimeMillis() - calculationStartTimeStamp));
                
        return pdfBytes;
    }
}