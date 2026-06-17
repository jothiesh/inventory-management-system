package com.company.inventory.service;

import com.company.inventory.dto.request.ProductRequest;
import com.company.inventory.entity.*;
import com.company.inventory.exception.ResourceNotFoundException;
import com.company.inventory.repository.ProductRepository;
import com.company.inventory.repository.StockMovementRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Service
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryService categoryService;
    private final SupplierService supplierService;
    private final RackService rackService;
    private final BoxService boxService;
    private final LotService lotService;
    private final StockMovementRepository movementRepository;
    private final AlertService alertService;

    public ProductService(
            ProductRepository productRepository,
            CategoryService categoryService,
            SupplierService supplierService,
            RackService rackService,
            BoxService boxService,
            @Lazy LotService lotService,
            StockMovementRepository movementRepository,
            AlertService alertService
    ) {
        this.productRepository = productRepository;
        this.categoryService = categoryService;
        this.supplierService = supplierService;
        this.rackService = rackService;
        this.boxService = boxService;
        this.lotService = lotService;
        this.movementRepository = movementRepository;
        this.alertService = alertService;
    }

    // ─────────────────────────────────────────────────────────────
    // READ
    // ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        log.debug("Querying repository for product instance matching key ID: {}", id);
        return productRepository.findById(id)
                .orElseThrow(() -> {
                    log.error("Product retrieval failed: No entity record found matching index ID: {}", id);
                    return new ResourceNotFoundException("Product", "id", id);
                });
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        log.debug("Request received to fetch all products inside the repository registry layer.");
        List<Product> products = productRepository.findAll();
        log.info("Fetched {} total products from the catalog data tables.", products.size());
        return products;
    }

    @Transactional(readOnly = true)
    public List<Product> getActiveProducts() {
        log.debug("Request received to extract exclusively active catalog product selections.");
        List<Product> activeProducts = productRepository.findByIsActiveTrue();
        log.info("Extracted {} active operational products from master schema tables.", activeProducts.size());
        return activeProducts;
    }

    @Transactional(readOnly = true)
    public List<Product> getProductsByCategory(Long categoryId) {
        log.debug("Filtering catalog inventory matrix for Category reference ID constraint: {}", categoryId);
        List<Product> products = productRepository.findByCategoryCategoryId(categoryId);
        log.info("Found {} inventory entities mapped under Category target index: {}", products.size(), categoryId);
        return products;
    }

    @Transactional(readOnly = true)
    public List<Product> searchProducts(String keyword) {
        log.debug("Processing request to execute open string index search against token phrase parameter: '{}'", keyword);
        if (keyword == null || keyword.trim().isEmpty()) {
            log.warn("Empty query parameter phrase intercepted inside query engine filter layer. Falling back to listing entire catalog structure.");
            return getAllProducts();
        }
        String cleanKeyword = keyword.trim();
        List<Product> results = productRepository.searchProducts(cleanKeyword);
        log.info("Keyword matching query completed. Discovered {} item variants matching text profile phrase: '{}'", results.size(), cleanKeyword);
        return results;
    }

    // ─────────────────────────────────────────────────────────────
    // SAVE — used by PATCH endpoints (min stock level etc.)
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Product saveProduct(Product product) {
        log.debug("Direct save called on product entity ID: {}", product.getProductId());
        return productRepository.save(product);
    }

    // ─────────────────────────────────────────────────────────────
    // CREATE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Product createProduct(ProductRequest request, User currentUser) {
        log.info("Initiating Product provision profile creation sequence. Proposed Part Number: '{}', Creator ID Reference: {}",
                request.getPartNumber(), currentUser != null ? currentUser.getUserId() : "SYSTEM");

        if (request.getPartNumber() != null && !request.getPartNumber().isBlank()) {
            log.trace("Validating corporate tracking identification alphanumeric unique boundaries matching token value: '{}'", request.getPartNumber());
            if (productRepository.existsByPartNumber(request.getPartNumber())) {
                log.error("Product creation aborted: Core uniqueness constraints violated. Part number '{}' already exists inside inventory index rows.", request.getPartNumber());
                throw new RuntimeException("Part number already exists: " + request.getPartNumber());
            }
        }

        Product product = new Product();
        setProductFields(product, request);
        product.setIsActive(true);
        product.setCreatedBy(currentUser);
        setProductRelations(product, request);

        product = productRepository.save(product);
        log.info("New baseline Product shell record mapped and saved securely. Allocated unique ID index: {}", product.getProductId());

        try {
            log.debug("Dispatching real-time notifications to corporate notifications hub layer framework matching product creation parameters node.");
            alertService.createNewProductAlert(product);
        } catch (Exception e) {
            log.error("Non-fatal alert deployment error occurring during profile initialization execution block: {}", e.getMessage());
        }

        if (request.getInitialQuantity() != null &&
                request.getInitialQuantity().compareTo(BigDecimal.ZERO) > 0) {
            log.info("Detected inline initial structural inventory injection parameter configuration layer. Injecting balance volume: {} units", request.getInitialQuantity());
            try {
                Lot lot = lotService.createLot(
                        product.getProductId(),
                        request.getSupplierId(),
                        request.getInitialQuantity(),
                        request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO,
                        LocalDate.now(),
                        request.getRackId(),
                        request.getBoxId(),
                        currentUser
                );

                StockMovement movement = new StockMovement();
                movement.setLot(lot);
                movement.setProduct(product);
                movement.setMovementType(StockMovement.MovementType.IN);
                movement.setTransactionType(StockMovement.TransactionType.Purchase);
                movement.setQuantity(request.getInitialQuantity());
                movement.setToRack(product.getRack());
                movement.setToBox(product.getBox());
                movement.setReferenceNumber("INITIAL-" + (product.getPartNumber() != null ? product.getPartNumber() : product.getProductId()));
                movement.setNotes("Initial stock on product creation");
                movement.setCreatedBy(currentUser);
                movementRepository.save(movement);

                try {
                    BigDecimal totalStock = lotService.getTotalStockByProduct(product.getProductId());
                    alertService.createStockAddedAlert(product, request.getInitialQuantity(), totalStock);
                } catch (Exception e) {
                    log.error("Non-fatal verification error lookup flag trace check: Metrics update notification intercept failure: {}", e.getMessage());
                }
            } catch (Exception e) {
                log.error("Critical fault occurred while spawning baseline initial seed storage tracking rows matrix for product entity framework loop: {}", e.getMessage());
            }
        }

        log.info("Product deployment ingestion execution procedure finished cleanly. Part sequence initialized code tag: '{}'", product.getPartNumber());
        return product;
    }

    // ─────────────────────────────────────────────────────────────
    // UPDATE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public Product updateProduct(Long id, ProductRequest request, User currentUser) {
        log.info("Processing mutation updates overlay request parameters context on operational product row record indexing tag matching ID: {}", id);
        Product product = getProductById(id);

        if (request.getPartNumber() != null && !request.getPartNumber().isBlank()) {
            if (!request.getPartNumber().equals(product.getPartNumber())) {
                log.trace("Part number transformation event detected ('{}' -> '{}'). Checking global uniqueness limitations tracking index maps.",
                        product.getPartNumber(), request.getPartNumber());
                if (productRepository.existsByPartNumber(request.getPartNumber())) {
                    log.error("Update aborted: Mutation rejected because the proposed alphanumeric identifier replacement code string '{}' overlaps an active tracking row cell index context.", request.getPartNumber());
                    throw new RuntimeException("Part number already exists: " + request.getPartNumber());
                }
            }
        }

        setProductFields(product, request);
        product.setUpdatedBy(currentUser);
        setProductRelations(product, request);

        Product updatedProduct = productRepository.save(product);
        log.info("Product profile entity definitions successfully modified and rewritten securely inside schemas database layout layer for record tracker index tag ID: {}", id);
        return updatedProduct;
    }

    // ─────────────────────────────────────────────────────────────
    // DELETE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public void deleteProduct(Long id) {
        log.warn("Triggering hard database rows purges decommissioning execution pipeline loop sequence against target catalog entry data ID: {}", id);
        Product product = getProductById(id);

        try {
            BigDecimal totalStock = lotService.getTotalStockByProduct(id);
            if (totalStock.compareTo(BigDecimal.ZERO) > 0) {
                log.error("Database deletion lifecycle process aborted: Cannot discard an item code profile carrying positive balance metrics weights. Target record ID: {}, Outstanding Qty Balance: {}", id, totalStock);
                throw new RuntimeException("Cannot delete product with existing stock. Current stock: " + totalStock);
            }
        } catch (RuntimeException re) {
            throw re;
        } catch (Exception e) {
            log.warn("Asset management check interrupted: Verification layer could not safely ascertain outstanding lot balances matching item tracking index: {}. Reason context trace: {}", id, e.getMessage());
        }

        productRepository.delete(product);
        log.info("Product entity completely erased from repository table columns matrix space indices cleanly. Associated original identifier tag was: '{}'", product.getPartNumber());
    }

    // ─────────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────────

    private void setProductFields(Product product, ProductRequest request) {
        log.trace("Mapping standard metadata property values fields mapping onto product entity container block layer indices.");
        product.setPartNumber(request.getPartNumber());
        product.setDescription(request.getDescription());
        product.setPackageType(request.getPackageType());
        product.setSpecification(request.getSpecification());
        product.setAlternativeComponent(request.getAlternativeComponent());
        product.setManufacturerPn(request.getManufacturerPn());
        product.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO);
        product.setMinStockLevel(request.getMinStockLevel() != null ? request.getMinStockLevel() : 10);
        product.setRemarks(request.getRemarks());
        product.setHsnCode(request.getHsnCode());
        product.setGstPercent(request.getGstPercent());
    }

    private void setProductRelations(Product product, ProductRequest request) {
        log.trace("Resolving relationship mapping entity boundaries links data nodes for foreign reference constraints variables keys.");

        if (request.getCategoryId() != null) {
            product.setCategory(categoryService.getCategoryById(request.getCategoryId()));
        }

        if (request.getSupplierId() != null) {
            product.setSupplier(supplierService.getSupplierById(request.getSupplierId()));
        } else {
            product.setSupplier(null);
        }

        if (request.getRackId() != null) {
            product.setRack(rackService.getRackById(request.getRackId()));
        } else {
            product.setRack(null);
        }

        if (request.getBoxId() != null) {
            product.setBox(boxService.getBoxById(request.getBoxId()));
        } else {
            product.setBox(null);
        }
    }
}