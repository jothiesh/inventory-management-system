package com.company.inventory.repository;

import com.company.inventory.entity.PurchaseInvoice;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseInvoiceRepository extends JpaRepository<PurchaseInvoice, Long> {

    Optional<PurchaseInvoice> findByInvoiceNoAndSupplierName(String invoiceNo, String supplierName);

    Optional<PurchaseInvoice> findByStockInBatchId(Long stockInBatchId);

    @Query("""
        SELECT pi FROM PurchaseInvoice pi
        WHERE (:q IS NULL OR :q = ''
               OR LOWER(pi.invoiceNo)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(pi.supplierName) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(pi.poNo)         LIKE LOWER(CONCAT('%', :q, '%')))
        ORDER BY pi.uploadedAt DESC
    """)
    Page<PurchaseInvoice> search(@Param("q") String q, Pageable pageable);

    List<PurchaseInvoice> findTop20ByOrderByUploadedAtDesc();

    // ──────────────────────────────────────────────────────────────
    // NATIVE — invoices read from stock_in_batch (one row per invoice_no)
    // ──────────────────────────────────────────────────────────────

    interface InvoiceListView {
        String        getInvoiceNo();
        String        getSupplierName();
        LocalDateTime getInvoiceDate();
        Long          getBatchCount();
        Number        getItemCount(); // Use Number to avoid BigDecimal/BigInteger casting crashes
    }

    @Query(value = """
        SELECT  b.invoice_no                     AS invoiceNo,
                MAX(b.supplier_name)             AS supplierName,
                MAX(b.created_at)                AS invoiceDate,
                COUNT(*)                         AS batchCount,
                COALESCE(SUM(b.item_count), 0)   AS itemCount
        FROM    stock_in_batch b
        WHERE   b.invoice_no IS NOT NULL
          AND   b.invoice_no <> ''
          AND  (:q = ''
                OR LOWER(b.invoice_no)    LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(b.supplier_name) LIKE LOWER(CONCAT('%', :q, '%')))
        GROUP BY b.invoice_no
        ORDER BY MAX(b.created_at) DESC
        """,
        countQuery = """
        SELECT COUNT(DISTINCT b.invoice_no)
        FROM stock_in_batch b
        WHERE b.invoice_no IS NOT NULL
          AND b.invoice_no <> ''
          AND (:q = ''
               OR LOWER(b.invoice_no)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(b.supplier_name) LIKE LOWER(CONCAT('%', :q, '%')))
        """,
        nativeQuery = true)
    Page<InvoiceListView> searchInvoicesGrouped(@Param("q") String q, Pageable pageable);

    // ──────────────────────────────────────────────────────────────
    // NATIVE — detail by invoice number (header + line items)
    // ──────────────────────────────────────────────────────────────

    @Query(value = """
        SELECT  b.invoice_no                     AS invoiceNo,
                MAX(b.supplier_name)             AS supplierName,
                MAX(b.created_at)                AS invoiceDate,
                COUNT(*)                         AS batchCount,
                COALESCE(SUM(b.item_count), 0)   AS itemCount
        FROM    stock_in_batch b
        WHERE   b.invoice_no = :invoiceNo
        GROUP BY b.invoice_no
        """, nativeQuery = true)
    InvoiceListView findHeaderByInvoiceNo(@Param("invoiceNo") String invoiceNo);

    interface InvoiceItemView {
        String     getPartNo();
        String     getDescription();
        String     getHsnSac();
        BigDecimal getQuantity();
        BigDecimal getUnitPrice();
        BigDecimal getLineTotal();
    }

    @Query(value = """
        SELECT  p.part_number        AS partNo,
                p.description        AS description,
                l.hsn_code           AS hsnSac,
                l.purchase_quantity  AS quantity,
                l.purchase_price     AS unitPrice,
                (l.purchase_quantity * l.purchase_price) AS lineTotal
        FROM    lots l
        JOIN    stock_in_batch b ON b.id = l.stock_in_batch_id
        LEFT JOIN products p ON p.product_id = l.product_id
        WHERE   b.invoice_no = :invoiceNo
        ORDER BY l.lot_id
        """, nativeQuery = true)
    List<InvoiceItemView> findItemsByInvoiceNo(@Param("invoiceNo") String invoiceNo);
}