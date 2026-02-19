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

    @Transactional(readOnly = true)
    public Product getProductById(Long id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
    }

    @Transactional(readOnly = true)
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Product> getActiveProducts() {
        return productRepository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<Product> getProductsByCategory(Long categoryId) {
        return productRepository.findByCategoryCategoryId(categoryId);
    }

    @Transactional(readOnly = true)
    public List<Product> searchProducts(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return getAllProducts();
        }
        return productRepository.searchProducts(keyword.trim());
    }

    @Transactional
    public Product createProduct(ProductRequest request, User currentUser) {
        
        log.info("Creating product: {}", request.getPartNumber());
        
        // Check if part number already exists
        if (productRepository.existsByPartNumber(request.getPartNumber())) {
            throw new RuntimeException("Part number already exists: " + request.getPartNumber());
        }
        
        // STEP 1: Create the product
        Product product = new Product();
        product.setPartNumber(request.getPartNumber());
        product.setDescription(request.getDescription());
        product.setPackageType(request.getPackageType());
        product.setSpecification(request.getSpecification());
        product.setAlternativeComponent(request.getAlternativeComponent());
        product.setManufacturerPn(request.getManufacturerPn());
        product.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO);
        product.setMinStockLevel(request.getMinStockLevel() != null ? request.getMinStockLevel() : 10);
        product.setRemarks(request.getRemarks());
        product.setIsActive(true);
        product.setCreatedBy(currentUser);
        
        // Set relationships
        if (request.getCategoryId() != null) {
            Category category = categoryService.getCategoryById(request.getCategoryId());
            product.setCategory(category);
        }
        
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierService.getSupplierById(request.getSupplierId());
            product.setSupplier(supplier);
        }
        
        if (request.getRackId() != null) {
            Rack rack = rackService.getRackById(request.getRackId());
            product.setRack(rack);
        }
        
        if (request.getBoxId() != null) {
            Box box = boxService.getBoxById(request.getBoxId());
            product.setBox(box);
        }
        
        product = productRepository.save(product);
        log.info("Product created with ID: {}", product.getProductId());
        
        // STEP 2: CREATE ALERT FOR NEW PRODUCT
        try {
            alertService.createNewProductAlert(product);
        } catch (Exception e) {
            log.error("Failed to create new product alert: {}", e.getMessage());
        }
        
        // STEP 3: If initial quantity provided, create stock
        if (request.getInitialQuantity() != null && 
            request.getInitialQuantity().compareTo(BigDecimal.ZERO) > 0) {
            
            log.info("Creating initial stock: {} units", request.getInitialQuantity());
            
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
                movement.setReferenceNumber("INITIAL-" + product.getPartNumber());
                movement.setNotes("Initial stock on product creation");
                movement.setCreatedBy(currentUser);
                
                movementRepository.save(movement);
                log.info("Initial stock created successfully");
                
                // CREATE ALERT FOR INITIAL STOCK
                try {
                    BigDecimal totalStock = lotService.getTotalStockByProduct(product.getProductId());
                    alertService.createStockAddedAlert(product, request.getInitialQuantity(), totalStock);
                } catch (Exception e) {
                    log.error("Failed to create stock added alert: {}", e.getMessage());
                }
                
            } catch (Exception e) {
                log.error("Failed to create initial stock: {}", e.getMessage());
            }
        }
        
        return product;
    }

    @Transactional
    public Product updateProduct(Long id, ProductRequest request, User currentUser) {
        Product product = getProductById(id);
        
        // Check if part number is being changed and if it already exists
        if (!product.getPartNumber().equals(request.getPartNumber()) && 
            productRepository.existsByPartNumber(request.getPartNumber())) {
            throw new RuntimeException("Part number already exists: " + request.getPartNumber());
        }
        
        product.setPartNumber(request.getPartNumber());
        product.setDescription(request.getDescription());
        product.setPackageType(request.getPackageType());
        product.setSpecification(request.getSpecification());
        product.setAlternativeComponent(request.getAlternativeComponent());
        product.setManufacturerPn(request.getManufacturerPn());
        product.setUnitPrice(request.getUnitPrice() != null ? request.getUnitPrice() : BigDecimal.ZERO);
        product.setMinStockLevel(request.getMinStockLevel() != null ? request.getMinStockLevel() : 10);
        product.setRemarks(request.getRemarks());
        product.setUpdatedBy(currentUser);
        
        if (request.getCategoryId() != null) {
            Category category = categoryService.getCategoryById(request.getCategoryId());
            product.setCategory(category);
        }
        
        if (request.getSupplierId() != null) {
            Supplier supplier = supplierService.getSupplierById(request.getSupplierId());
            product.setSupplier(supplier);
        } else {
            product.setSupplier(null);
        }
        
        if (request.getRackId() != null) {
            Rack rack = rackService.getRackById(request.getRackId());
            product.setRack(rack);
        } else {
            product.setRack(null);
        }
        
        if (request.getBoxId() != null) {
            Box box = boxService.getBoxById(request.getBoxId());
            product.setBox(box);
        } else {
            product.setBox(null);
        }
        
        return productRepository.save(product);
    }

    @Transactional
    public void deleteProduct(Long id) {
        Product product = getProductById(id);
        
        // Check if product has stock
        try {
            BigDecimal totalStock = lotService.getTotalStockByProduct(id);
            if (totalStock.compareTo(BigDecimal.ZERO) > 0) {
                throw new RuntimeException("Cannot delete product with existing stock. Current stock: " + totalStock);
            }
        } catch (Exception e) {
            log.warn("Could not check stock for product {}: {}", id, e.getMessage());
        }
        
        productRepository.delete(product);
        log.info("Product deleted: {}", product.getPartNumber());
    }
}