package com.company.inventory;

import com.company.inventory.service.InitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)  // Run this BEFORE FrontendLauncher
@RequiredArgsConstructor
@Slf4j
public class DatabaseInitializer implements CommandLineRunner {

    private final InitService initService;

    @Override
    public void run(String... args) throws Exception {
        log.info("========================================");
        log.info("🗄️  DATABASE AUTO-INITIALIZATION");
        log.info("========================================");

        try {
            // Initialize Users
            log.info("Initializing users...");
            int users = initService.initializeUsers();
            log.info("✅ Users: {} created", users);

            // Initialize Categories
            log.info("Initializing categories...");
            int categories = initService.initializeCategories();
            log.info("✅ Categories: {} created", categories);

            // Initialize Racks
            log.info("Initializing racks...");
            int racks = initService.initializeRacks();
            log.info("✅ Racks: {} created", racks);

            // Initialize Boxes
            log.info("Initializing boxes...");
            int boxes = initService.initializeBoxes();
            log.info("✅ Boxes: {} created", boxes);

            log.info("========================================");
            log.info("✅ DATABASE INITIALIZATION COMPLETE");
            log.info("   Users: {}", users);
            log.info("   Categories: {}", categories);
            log.info("   Racks: {}", racks);
            log.info("   Boxes: {}", boxes);
            log.info("========================================");
            log.info("🔐 LOGIN CREDENTIALS:");
            log.info("   Owner    - username: owner,   password: owner123");
            log.info("   Manager  - username: manager, password: manager123");
            log.info("========================================");

        } catch (Exception e) {
            log.error("❌ DATABASE INITIALIZATION FAILED!", e);
            log.error("Error: {}", e.getMessage());
        }
    }
}