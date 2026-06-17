package com.company.inventory.qc.service;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.company.inventory.entity.Category;
import com.company.inventory.entity.Lot;
import com.company.inventory.entity.User;
import com.company.inventory.exception.QcException;
import com.company.inventory.qc.dto.BulkQcDecisionRequest;
import com.company.inventory.qc.dto.ChecklistTemplateDto;
import com.company.inventory.qc.dto.PerItemQcDecisionRequest;
import com.company.inventory.qc.dto.QcBatchDetailDto;
import com.company.inventory.qc.dto.QcDecisionResponse;
import com.company.inventory.qc.dto.QcQueueItemDto;
import com.company.inventory.qc.entity.QcAuditLog;
import com.company.inventory.qc.entity.QcInspection;
import com.company.inventory.qc.entity.StockInBatch;
import com.company.inventory.qc.enums.QcDecision;
import com.company.inventory.qc.enums.QcStatus;
import com.company.inventory.qc.pdf.QcChecklistPdfGenerator;
import com.company.inventory.qc.repository.QcAuditLogRepository;
import com.company.inventory.qc.repository.QcChecklistTemplateRepository;
import com.company.inventory.qc.repository.QcInspectionRepository;
import com.company.inventory.qc.repository.StockInBatchRepository;
import com.company.inventory.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class QcInspectionService {

	private final StockInBatchRepository batchRepo;
	private final QcInspectionRepository inspectionRepo;
	private final QcChecklistTemplateRepository templateRepo;
	private final QcAuditLogRepository auditRepo;
	private final UserRepository userRepo;

	private final QcStockBridge stockBridge;
	private final QcTemplateService templateService;
	private final QcChecklistPdfGenerator pdfGenerator;

	private final QcAlertService qcAlertService;
	private final QcEmailNotificationService qcEmailService;
	private final com.company.inventory.qc.repository.BatchTimelineRepository timelineRepo;

	// =================================================================
	// QUEUE
	// =================================================================

	@Transactional(readOnly = true)
	public List<QcQueueItemDto> getPendingQueue() {
		log.debug("Polling core SIB repository layer to assemble the real-time active 'PENDING_QC' work queue.");
		return batchRepo.findByQcStatusOrderByCreatedAtDesc(QcStatus.PENDING_QC.name()).stream().map(this::toQueueItem)
				.collect(Collectors.toList());
	}

	// =================================================================
	// BATCH DETAIL
	// =================================================================

	@Transactional(readOnly = true)
	public QcBatchDetailDto getBatchDetail(Long batchId) {
		log.info("Loading profile entity structural parameters layout details for Inspection SIB container ID: {}",
				batchId);
		StockInBatch batch = batchRepo.findById(batchId).orElseThrow(() -> {
			log.error("Aborting layout load: SIB record tracking reference target missing for ID: {}", batchId);
			return QcException.notFound("Batch " + batchId + " not found");
		});

		// ★ PARTIAL SUBMISSION: only lots still WITHOUT a QC decision are
		// shown for inspection. Lots decided in an earlier partial
		// submit are excluded — they are done; the rest is the
		// "waiting list".
		List<Lot> lots = stockBridge.getLotsForBatch(batchId).stream()
				.filter(l -> l.getQcDecision() == null || l.getQcDecision().isBlank()).collect(Collectors.toList());
		log.debug(
				"SIB identification pointer verified. Discovered {} PENDING subline lot elements linked to batch asset.",
				lots.size());

		List<QcBatchDetailDto.BatchLot> lotDtos = lots.stream().map(lot -> {
			var product = lot.getProduct();
			var category = product != null ? product.getCategory() : null;

			// Resolve fallbacks for empty category strings
			String parsedCode = resolveCategoryCode(lot);
			String parsedName = (category != null) ? category.getCategoryName() : parsedCode;

			return QcBatchDetailDto.BatchLot.builder().lotId(lot.getLotId()).lotNumber(lot.getLotNumber())
					.productId(product != null ? product.getProductId() : null)
					.partNumber(product != null ? product.getPartNumber() : null)
					.description(product != null ? product.getDescription() : null).categoryCode(parsedCode)
					.categoryName(parsedName).qtyReceived(lot.getPurchaseQuantity()).build();
		}).collect(Collectors.toList());

		String derivedCategoryCode = lotDtos.isEmpty() ? "STICKER" : lotDtos.get(0).getCategoryCode();
		String derivedCategoryName = lotDtos.isEmpty() ? "STICKER" : lotDtos.get(0).getCategoryName();

		Set<String> categoryCodes = lotDtos.stream().map(QcBatchDetailDto.BatchLot::getCategoryCode)
				.collect(Collectors.toSet());
		log.trace("Extracted operational category criteria components token matching: {}", categoryCodes);

		List<ChecklistTemplateDto> templates = templateService.getAllActiveTemplates().stream()
				.filter(t -> categoryCodes.contains(t.getCategoryCode())).collect(Collectors.toList());

		String finalInvoice = (batch.getInvoiceNo() == null || batch.getInvoiceNo().isBlank()) ? "—"
				: batch.getInvoiceNo();

		return QcBatchDetailDto.builder().batchId(batch.getId()).batchRef(batch.getBatchRef()).invoiceNo(finalInvoice)
				.supplierName(batch.getSupplierName()).receivedDate(batch.getReceivedDate())
				.qcStatus(QcStatus.valueOf(batch.getQcStatus())).notes(batch.getNotes()).lots(lotDtos)
				.applicableTemplates(templates).categoryCode(derivedCategoryCode).categoryName(derivedCategoryName)
				.totalQuantity(batch.getTotalQty()).build();
	}

	// =================================================================
	// BULK DECISION
	// =================================================================

	@Transactional
	public QcDecisionResponse bulkDecision(BulkQcDecisionRequest req, boolean generatePdf) {
		log.info(
				"Processing unified transactional BULK QC signoff routine operation execution. Target SIB ID: {}, Action Flag: [{}]",
				req.getBatchId(), req.getDecision());

		StockInBatch batch = loadBatchForInspection(req.getBatchId());

		// ★ PARTIAL SUBMISSION: bulk decision applies to the lots still
		// waiting (undecided). Lots already decided in an earlier
		// partial submit must never be processed twice.
		List<Lot> lots = stockBridge.getLotsForBatch(batch.getId()).stream()
				.filter(l -> l.getQcDecision() == null || l.getQcDecision().isBlank()).collect(Collectors.toList());
		if (lots.isEmpty()) {
			throw QcException.badRequest("No pending items left in this batch");
		}

		QcDecision decision = req.getDecision();
		if (decision == null || decision == QcDecision.PARTIAL) {
			log.error(
					"Bulk process operation signature violation aborted: Partial status conversions are forbidden inside uniform workflows endpoints.");
			throw QcException.badRequest("Bulk decision must be ACCEPTED / REJECTED / HOLD");
		}

		User actor = currentUser();
		QcInspection inspection = createInspectionRow(batch, lots.size(), decision.name(), req.getOverallRemarks(),
				actor, req.getTemplateCode());

		BigDecimal totalAcc = BigDecimal.ZERO, totalRej = BigDecimal.ZERO, totalHold = BigDecimal.ZERO;

		for (Lot lot : lots) {
			BigDecimal received = lot.getPurchaseQuantity();
			BigDecimal acc = BigDecimal.ZERO, rej = BigDecimal.ZERO, hold = BigDecimal.ZERO;

			switch (decision) {
			case ACCEPTED -> acc = received;
			case REJECTED -> rej = received;
			case HOLD -> hold = received;
			default -> throw QcException.badRequest("Unexpected decision: " + decision);
			}

			if (decision == QcDecision.ACCEPTED) {
				stockBridge.releaseLotToStock(lot, acc);
			}
			stockBridge.writeQcOutcomeOnLot(lot, decision.name(), acc, rej, hold, req.getOverallRemarks());
			totalAcc = totalAcc.add(acc);
			totalRej = totalRej.add(rej);
			totalHold = totalHold.add(hold);
		}

		// ★ Final status considers ALL lots of the batch (incl. earlier
		// partial submissions), not only this bulk action.
		QcStatus newStatus = computeFinalStatus(stockBridge.getLotsForBatch(batch.getId()));
		finalizeBatch(batch, newStatus, actor);

		String pdfPath = generateAndPersistPdf(inspection);
		audit("BULK_" + decision.name(), inspection.getId(), batch.getId(), actor, "qty acc=" + totalAcc + ", rej="
				+ totalRej + ", hold=" + totalHold + (generatePdf ? " [PDF]" : " [NO_PDF]"));

		try {
			String eventType = "ACCEPTED".equals(decision.name()) ? "QC_ACCEPTED"
					: "REJECTED".equals(decision.name()) ? "QC_REJECTED" : "QC_HOLD";
			String detail = String.format("Decision: %s · Accepted: %s · Rejected: %s · Held: %s · Inspector: %s",
					decision.name(), totalAcc.toPlainString(), totalRej.toPlainString(), totalHold.toPlainString(),
					actor != null ? actor.getUsername() : "—");
			com.company.inventory.qc.entity.BatchTimelineEvent event = com.company.inventory.qc.entity.BatchTimelineEvent
					.builder().batchId(batch.getId()).eventType(eventType).title("QC Inspection: " + decision.name())
					.detail(detail).refId(inspection.getId()).refType("INSPECTION")
					.happenedAt(java.time.LocalDateTime.now()).createdBy(actor).build();
			timelineRepo.save(event);
		} catch (Exception e) {
			log.warn("Timeline event failed: {}", e.getMessage());
		}

		try {
			int totalRejectedInt = totalRej.intValue();
			if (totalRejectedInt > 0 || decision == QcDecision.REJECTED || decision == QcDecision.PARTIAL) {
				log.warn(
						"Defective limits reached. Spawning alert logs notifications channels workflows protocols for code reference: {}",
						batch.getBatchRef());
				qcAlertService.alertRejection(inspection.getId(), batch.getId(), batch.getBatchRef(), totalRejectedInt,
						req.getOverallRemarks());
				qcEmailService.sendRejectionEmail(batch.getBatchRef(), totalRejectedInt, req.getOverallRemarks(),
						actor.getUsername());
			}
		} catch (Exception e) {
			log.warn("Failed to fire QC rejection alerts for batch {}", batch.getBatchRef(), e);
		}

		log.info(
				"Bulk inspection process lifecycle pipeline terminated neatly matching code item verification token target: {}",
				batch.getBatchRef());
		return QcDecisionResponse.builder().inspectionId(inspection.getId()).batchId(batch.getId())
				.batchStatus(newStatus).overallDecision(decision).lotCount(lots.size()).totalAccepted(totalAcc)
				.totalRejected(totalRej).totalHeld(totalHold)
				.pdfDownloadUrl(pdfPath != null ? "/api/qc/inspections/" + inspection.getId() + "/pdf" : null).build();
	}

	// =================================================================
	// PER-ITEM DECISION
	// ★ PARTIAL SUBMISSION SUPPORT:
	// - Frontend may send only a SUBSET of the pending lots.
	// - Submitted lots are decided (stock released etc).
	// - If any lots remain undecided, the batch STAYS PENDING_QC —
	// it remains in the waiting list / queue with the remaining
	// items only.
	// - When the last pending lot is decided, the batch is finalized
	// with a status computed across ALL its lots.
	// =================================================================

	@Transactional
	public QcDecisionResponse perItemDecision(PerItemQcDecisionRequest req, boolean generatePdf) {
		log.info(
				"Processing granular itemized dynamic PER-ITEM QC breakdown loop transaction context. Target SIB reference ID: {}",
				req.getBatchId());

		StockInBatch batch = loadBatchForInspection(req.getBatchId());
		List<Lot> allLots = stockBridge.getLotsForBatch(batch.getId());

		// Only lots that are still waiting for a decision
		List<Lot> pendingLots = allLots.stream().filter(l -> l.getQcDecision() == null || l.getQcDecision().isBlank())
				.collect(Collectors.toList());

		Map<Long, Lot> lotById = new HashMap<>();
		for (Lot l : pendingLots)
			lotById.put(l.getLotId(), l);

		if (req.getItems() == null || req.getItems().isEmpty()) {
			throw QcException.badRequest("At least one item decision is required");
		}
		// ★ CHANGED: subset is allowed — only forbid MORE items than pending
		if (req.getItems().size() > pendingLots.size()) {
			throw QcException.badRequest(
					"Decision count " + req.getItems().size() + " exceeds pending lot count " + pendingLots.size());
		}

		User actor = currentUser();
		QcInspection inspection = createInspectionRow(batch, req.getItems().size(), "PARTIAL", req.getOverallRemarks(),
				actor, req.getTemplateCode());

		BigDecimal totalAcc = BigDecimal.ZERO, totalRej = BigDecimal.ZERO, totalHold = BigDecimal.ZERO;
		boolean anyAccepted = false, anyRejected = false, anyHeld = false;
		Set<Long> processedIds = new HashSet<>();

		for (PerItemQcDecisionRequest.ItemDecision item : req.getItems()) {
			Lot lot = lotById.get(item.getLotId());
			if (lot == null) {
				throw QcException.badRequest("Lot " + item.getLotId() + " is not pending in batch " + batch.getId());
			}
			if (!processedIds.add(item.getLotId())) {
				throw QcException.badRequest("Duplicate decision for lot " + item.getLotId());
			}

			BigDecimal acc = nz(item.getQtyAccepted());
			BigDecimal rej = nz(item.getQtyRejected());
			BigDecimal hold = nz(item.getQtyHeld());

			log.trace(
					"Evaluating subline mathematical quantitative logic values loops against lot string descriptor: '{}'",
					lot.getLotNumber());
			stockBridge.validateQuantityMath(lot.getPurchaseQuantity(), acc, rej, hold);

			String decisionStr = item.getDecision() != null ? item.getDecision().name()
					: autoDecision(acc, rej, hold).name();

			if (acc.compareTo(BigDecimal.ZERO) > 0) {
				stockBridge.releaseLotToStock(lot, acc);
				anyAccepted = true;
			}
			if (rej.compareTo(BigDecimal.ZERO) > 0)
				anyRejected = true;
			if (hold.compareTo(BigDecimal.ZERO) > 0)
				anyHeld = true;

			stockBridge.writeQcOutcomeOnLot(lot, decisionStr, acc, rej, hold, item.getRejectionReason());

			totalAcc = totalAcc.add(acc);
			totalRej = totalRej.add(rej);
			totalHold = totalHold.add(hold);
		}

		int remaining = pendingLots.size() - processedIds.size();

		// Overall decision for THIS inspection (the submitted items)
		QcDecision overall = anyAccepted && (anyRejected || anyHeld) ? QcDecision.PARTIAL
				: anyAccepted ? QcDecision.ACCEPTED : anyRejected ? QcDecision.REJECTED : QcDecision.HOLD;

		inspection.setOverallDecision(overall.name());
		inspectionRepo.save(inspection);

		QcStatus newStatus;
		if (remaining > 0) {
			// ★ WAITING LIST: undecided lots remain — batch stays in the
			// PENDING_QC queue with the remaining items only.
			newStatus = QcStatus.PENDING_QC;
			log.info(
					"Partial per-item submission on batch {} — {} item(s) decided, {} still pending. Batch remains in QC waiting list.",
					batch.getBatchRef(), processedIds.size(), remaining);
		} else {
			// last pending lot decided — finalize using ALL lots' outcomes
			newStatus = computeFinalStatus(allLots);
			finalizeBatch(batch, newStatus, actor);
		}

		String pdfPath = generateAndPersistPdf(inspection);
		audit((remaining > 0 ? "PER_ITEM_PARTIAL_" : "PER_ITEM_") + overall.name(), inspection.getId(), batch.getId(),
				actor,
				"items=" + req.getItems().size() + (remaining > 0 ? " remaining=" + remaining : "") + " acc=" + totalAcc
						+ " rej=" + totalRej + " hold=" + totalHold + (generatePdf ? " [PDF]" : " [NO_PDF]"));

		try {
			int totalRejectedInt = totalRej.intValue();
			if (totalRejectedInt > 0 || overall == QcDecision.REJECTED || overall == QcDecision.PARTIAL) {
				log.warn(
						"Itemized processing loop identified discrepancies. Forwarding alert tracking records across dashboard vectors for: {}",
						batch.getBatchRef());
				qcAlertService.alertRejection(inspection.getId(), batch.getId(), batch.getBatchRef(), totalRejectedInt,
						req.getOverallRemarks());
				qcEmailService.sendRejectionEmail(batch.getBatchRef(), totalRejectedInt, req.getOverallRemarks(),
						actor.getUsername());
			}
		} catch (Exception e) {
			log.warn("Failed to fire QC rejection alerts for batch {}", batch.getBatchRef(), e);
		}

		return QcDecisionResponse.builder().inspectionId(inspection.getId()).batchId(batch.getId())
				.batchStatus(newStatus).overallDecision(overall).lotCount(req.getItems().size()).totalAccepted(totalAcc)
				.totalRejected(totalRej).totalHeld(totalHold)
				.pdfDownloadUrl(pdfPath != null ? "/api/qc/inspections/" + inspection.getId() + "/pdf" : null).build();
	}

	// =================================================================
	// HELPERS
	// =================================================================

	private StockInBatch loadBatchForInspection(Long batchId) {
		StockInBatch batch = batchRepo.findById(batchId)
				.orElseThrow(() -> QcException.notFound("Batch " + batchId + " not found"));
		if (!QcStatus.PENDING_QC.name().equals(batch.getQcStatus())) {
			log.error(
					"Duplicate checkpoint inspection transaction rejected: SIB target container tracking unit {} already bears processed state flags: {}",
					batchId, batch.getQcStatus());
			throw QcException.alreadyInspected(batchId);
		}
		return batch;
	}

	/**
	 * ★ Final batch status computed across ALL lots — used when the last pending
	 * lot has been decided (possibly over multiple partial submissions).
	 */
	private QcStatus computeFinalStatus(List<Lot> allLots) {
		boolean anyAcc = false, anyRej = false, anyHeld = false;
		for (Lot l : allLots) {
			if (nz(l.getQcQtyAccepted()).compareTo(BigDecimal.ZERO) > 0)
				anyAcc = true;
			if (nz(l.getQcQtyRejected()).compareTo(BigDecimal.ZERO) > 0)
				anyRej = true;
			if (nz(l.getQcQtyHeld()).compareTo(BigDecimal.ZERO) > 0)
				anyHeld = true;
		}
		if (anyAcc && (anyRej || anyHeld))
			return QcStatus.PARTIAL_APPROVED;
		if (anyAcc)
			return QcStatus.QC_APPROVED;
		if (anyRej)
			return QcStatus.QC_REJECTED;
		return QcStatus.QC_HOLD;
	}

	private QcInspection createInspectionRow(StockInBatch batch, int lotCount, String overallDecision, String remarks,
			User actor) {
		return createInspectionRow(batch, lotCount, overallDecision, remarks, actor, null);
	}

	private QcInspection createInspectionRow(StockInBatch batch, int lotCount, String overallDecision, String remarks,
			User actor, String templateCode) {
		QcInspection insp = new QcInspection();
		insp.setBatch(batch);
		insp.setInvoiceNo(batch.getInvoiceNo());
		insp.setSupplierName(batch.getSupplierName());
		insp.setReceivedDate(batch.getReceivedDate());
		insp.setLotCount(lotCount);
		insp.setOverallDecision(overallDecision);
		insp.setOverallRemarks(remarks);
		insp.setInspectedBy(actor);
		insp.setInspectedAt(LocalDateTime.now());
		if (templateCode != null && !templateCode.isBlank()) {
			insp.setTemplateCode(templateCode.toUpperCase().trim());
		}
		return inspectionRepo.save(insp);
	}

	private void finalizeBatch(StockInBatch batch, QcStatus newStatus, User actor) {
		batch.setQcStatus(newStatus.name());
		batch.setQcCompletedAt(LocalDateTime.now());
		batch.setQcCompletedBy(actor);
		batchRepo.save(batch);
	}

	private String generateAndPersistPdf(QcInspection inspection) {
		try {
			log.debug(
					"Invoking canvas compilation engines block thread context to assemble iText digital report asset.");
			String path = pdfGenerator.generate(inspection);
			inspection.setPdfPath(path);
			inspectionRepo.save(inspection);
			audit("PDF_GENERATED", inspection.getId(), inspection.getBatch().getId(), inspection.getInspectedBy(),
					path);
			return path;
		} catch (Exception e) {
			log.error("PDF generation failed for inspection {}", inspection.getId(), e);
			return null;
		}
	}

	private QcDecision autoDecision(BigDecimal acc, BigDecimal rej, BigDecimal hold) {
		boolean a = acc.compareTo(BigDecimal.ZERO) > 0;
		boolean r = rej.compareTo(BigDecimal.ZERO) > 0;
		boolean h = hold.compareTo(BigDecimal.ZERO) > 0;
		if (a && (r || h))
			return QcDecision.PARTIAL;
		if (a)
			return QcDecision.ACCEPTED;
		if (r)
			return QcDecision.REJECTED;
		return QcDecision.HOLD;
	}

	private void audit(String action, Long inspectionId, Long batchId, User actor, String notes) {
		QcAuditLog logItem = new QcAuditLog();
		logItem.setAction(action);
		logItem.setInspectionId(inspectionId);
		logItem.setBatchId(batchId);
		if (actor != null) {
			logItem.setActorUserId(actor.getUserId());
			logItem.setActorUsername(actor.getUsername());
		}
		logItem.setActorIp(currentIp());
		logItem.setNotes(notes);
		auditRepo.save(logItem);
	}

	private User currentUser() {
		Authentication auth = SecurityContextHolder.getContext().getAuthentication();
		if (auth == null)
			throw QcException.badRequest("No authenticated user");
		String username = auth.getName();
		return userRepo.findByUsername(username)
				.orElseThrow(() -> QcException.badRequest("User not found: " + username));
	}

	private String currentIp() {
		try {
			ServletRequestAttributes a = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
			if (a == null)
				return null;
			HttpServletRequest req = a.getRequest();
			String xff = req.getHeader("X-Forwarded-For");
			if (xff != null && !xff.isBlank())
				return xff.split(",")[0].trim();
			return req.getRemoteAddr();
		} catch (Exception e) {
			return null;
		}
	}

	// --- INTEGRATED PATCH 1: toQueueItem ---
	private QcQueueItemDto toQueueItem(StockInBatch b) {
		List<Lot> lots = stockBridge.getLotsForBatch(b.getId());

		// ★ queue shows the WAITING items count (undecided lots only)
		List<Lot> pendingLots = lots.stream().filter(l -> l.getQcDecision() == null || l.getQcDecision().isBlank())
				.collect(Collectors.toList());

		List<String> categoryCodes = pendingLots.stream().map(this::resolveCategoryCode).distinct()
				.collect(Collectors.toList());
		if (categoryCodes.isEmpty()) {
			categoryCodes = lots.stream().map(this::resolveCategoryCode).distinct().collect(Collectors.toList());
		}

		String primaryCategoryCode = categoryCodes.isEmpty() ? "GENERAL" : categoryCodes.get(0);

		String primaryCategoryName = pendingLots.stream()
				.filter(l -> l.getProduct() != null && l.getProduct().getCategory() != null)
				.map(l -> l.getProduct().getCategory().getCategoryName()).filter(n -> n != null && !n.isBlank())
				.findFirst().orElse(primaryCategoryCode);

		return QcQueueItemDto.builder().batchId(b.getId()).batchRef(b.getBatchRef()).invoiceNo(b.getInvoiceNo())
				.supplierName(b.getSupplierName()).receivedDate(b.getReceivedDate())
				.itemCount(pendingLots.isEmpty() ? lots.size() : pendingLots.size()).totalQty(b.getTotalQty())
				.categoryCode(primaryCategoryCode)
//                .categoryName(primaryCategoryName)       
				.categoriesPresent(categoryCodes).qcStatus(QcStatus.valueOf(b.getQcStatus()))
				.createdAt(b.getCreatedAt()).createdBy(b.getCreatedBy() != null ? b.getCreatedBy().getUsername() : null)
				.build();
	}

	// --- INTEGRATED PATCH 2: resolveCategoryCode ---
	private String resolveCategoryCode(Lot lot) {
		if (lot.getProduct() == null)
			return "GENERAL";

		Category c = lot.getProduct().getCategory();
		if (c == null)
			return "GENERAL";

		String code = c.getCategoryCode();
		if (code != null && !code.isBlank()) {
			return code.toUpperCase().trim();
		}

		String name = c.getCategoryName() == null ? "" : c.getCategoryName().toUpperCase();
		if (name.contains("STICKER") || name.contains("LABEL"))
			return "STICKER";
		if (name.contains("INTEGRATED") || name.contains(" IC"))
			return "IC";
		if (name.contains("PCB") || name.contains("BOARD"))
			return "PCB";
		if (name.contains("ENCLOSURE") || name.contains("MECH"))
			return "ENCLOSURE";

		return name.isBlank() ? "GENERAL" : name;
	}

	private BigDecimal nz(BigDecimal v) {
		return v == null ? BigDecimal.ZERO : v;
	}
}