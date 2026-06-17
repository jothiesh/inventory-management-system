package com.company.inventory.exception;

import lombok.extern.slf4j.Slf4j;

/**
 * Custom exception for QC module errors.
 * Carries an error code + message so the global exception handler
 * can return structured JSON responses.
 */
@Slf4j
public class QcException extends RuntimeException {

    private final String code;
    private final int httpStatus; 

    public QcException(String code, String message) {
        super(message);
        this.code = code;
        this.httpStatus = 400; // Default fallback to Bad Request
    }

    public QcException(String code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public QcException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
        this.httpStatus = 400;
    }

    public String getCode() {
        return code;
    }

    public int getHttpStatus() {
        return httpStatus;
    }

    // ─── Factory methods ───

    public static QcException notFound(String what) {
        log.warn("Triggering runtime exception trace: QC_NOT_FOUND targeting context element '{}'", what);
        return new QcException("QC_NOT_FOUND", what + " not found", 404);
    }

    public static QcException alreadyInspected(Long batchId) {
        log.warn("Triggering runtime exception trace: QC_ALREADY_INSPECTED. Target collection container index: {}", batchId);
        return new QcException(
            "QC_ALREADY_INSPECTED",
            "Batch " + batchId + " has already been inspected",
            400
        );
    }

    public static QcException invalidQuantity(String detail) {
        log.warn("Triggering runtime exception trace: QC_INVALID_QTY. Calculation boundary logic failure: {}", detail);
        return new QcException("QC_INVALID_QTY", detail, 400);
    }

    public static QcException badRequest(String detail) {
        log.warn("Triggering runtime exception trace: QC_BAD_REQUEST. Processing aborted on parameter failure: {}", detail);
        return new QcException("QC_BAD_REQUEST", detail, 400);
    }

    public static QcException invalidState(String detail) {
        log.warn("Triggering runtime exception trace: QC_INVALID_STATE. Structural target state transition denied: {}", detail);
        return new QcException("QC_INVALID_STATE", detail, 400);
    }

    public static QcException templateNotFound(String categoryCode) {
        log.warn("Triggering runtime exception trace: QC_TEMPLATE_NOT_FOUND matching Category configuration tracker label: '{}'", categoryCode);
        return new QcException(
            "QC_TEMPLATE_NOT_FOUND",
            "No active checklist template for category: " + categoryCode,
            404
        );
    }

    public static QcException pdfGenerationFailed(String reason) {
        log.error("Triggering runtime exception trace: QC_PDF_FAILED. iText canvas rendering dropped error context payload: {}", reason);
        return new QcException("QC_PDF_FAILED", "PDF generation failed: " + reason, 500);
    }
}