package com.company.inventory.service;

import com.company.inventory.entity.*;
import com.company.inventory.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class InitService {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final RackRepository rackRepository;
    private final BoxRepository boxRepository;
    private final PasswordEncoder passwordEncoder;

   

    @Transactional
    public int initializeCategories() {
        if (categoryRepository.count() > 0) {
            log.info("Categories already initialized");
            return 0;
        }

        String[][] categoriesData = {
            {"CAT-RES", "Resistors", "Fixed and variable resistors"},
            {"CAT-CAP", "Capacitors", "Electrolytic, ceramic, and film capacitors"},
            {"CAT-DIO", "Diodes", "Rectifier, Zener, and LED diodes"},
            {"CAT-TRN", "Transistors", "BJT, FET, and MOSFET transistors"},
            {"CAT-IC", "Integrated Circuits", "Analog and digital ICs"},
            {"CAT-IND", "Inductors", "Fixed and variable inductors"},
            {"CAT-REL", "Relays", "Electromagnetic and solid-state relays"},
            {"CAT-SW", "Switches", "Push buttons, toggles, and rotary switches"},
            {"CAT-CON", "Connectors", "Pin headers, terminal blocks, and connectors"},
            {"CAT-PCB", "PCBs", "Printed circuit boards"},
            {"CAT-POT", "Potentiometers", "Single-turn and multi-turn potentiometers"},
            {"CAT-SEN", "Sensors", "Temperature, proximity, and other sensors"},
            {"CAT-MISC", "Miscellaneous", "Other electronic components"}
        };

        for (String[] cat : categoriesData) {
            Category category = new Category();
            category.setCategoryCode(cat[0]);
            category.setCategoryName(cat[1]);
            category.setDescription(cat[2]);
            category.setIsActive(true);
            category.setCreatedAt(LocalDateTime.now());
            category.setUpdatedAt(LocalDateTime.now());
            categoryRepository.save(category);
        }

        log.info("Initialized {} categories", categoriesData.length);
        return categoriesData.length;
    }

    @Transactional
    public int initializeRacks() {
        if (rackRepository.count() > 0) {
            log.info("Racks already initialized");
            return 0;
        }

        String[][] racksData = {
            {"RACK-A", "Rack A", "Main Storage Area - Left Section"},
            {"RACK-B", "Rack B", "Main Storage Area - Center Section"},
            {"RACK-C", "Rack C", "Main Storage Area - Right Section"},
            {"RACK-D", "Rack D", "Secondary Storage Area"}
        };

        for (String[] r : racksData) {
            Rack rack = new Rack();
            rack.setRackNumber(r[0]);
            rack.setRackName(r[1]);
            rack.setLocation(r[2]);
            rack.setIsActive(true);
            rack.setCreatedAt(LocalDateTime.now());
            rack.setUpdatedAt(LocalDateTime.now());
            rackRepository.save(rack);
        }

        log.info("Initialized {} racks", racksData.length);
        return racksData.length;
    }

    @Transactional
    public int initializeBoxes() {
        if (boxRepository.count() > 0) {
            log.info("Boxes already initialized");
            return 0;
        }

        int count = 0;
        for (Rack rack : rackRepository.findAll()) {
            for (int i = 1; i <= 5; i++) {
                Box box = new Box();
                box.setRack(rack);
                box.setBoxNumber(String.valueOf(i));
                box.setBoxLabel("Box " + i + " in " + rack.getRackName());
                box.setIsActive(true);
                boxRepository.save(box);
                count++;
            }
        }

        log.info("Initialized {} boxes", count);
        return count;
    }
    
    
    @Transactional
    public int initializeUsers() {
        log.info("Starting user initialization...");
        
        int count = 0;
        
        // Create Owner if not exists
        if (!userRepository.existsByUsername("owner")) {
            User owner = new User();
            owner.setUsername("owner");
            owner.setPasswordHash("owner123");  // ✅ PLAIN TEXT
            owner.setFullName("Store Owner");
            owner.setRole(User.UserRole.OWNER);
            owner.setEmail("owner@company.com");
            owner.setPhone("9876543210");
            owner.setIsActive(true);
            owner.setCreatedAt(LocalDateTime.now());
            owner.setUpdatedAt(LocalDateTime.now());
            
            userRepository.save(owner);
            count++;
            
            log.info("✅ Created Owner - username: owner, password: owner123");
            System.out.println("✅ Created Owner - username: owner, password: owner123");
        } else {
            log.info("Owner already exists");
        }

        // Create Manager if not exists
        if (!userRepository.existsByUsername("manager")) {
            User manager = new User();
            manager.setUsername("manager");
            manager.setPasswordHash("manager123");  // ✅ PLAIN TEXT
            manager.setFullName("Store Manager");
            manager.setRole(User.UserRole.STORE_MANAGER);
            manager.setEmail("manager@company.com");
            manager.setPhone("9876543211");
            manager.setIsActive(true);
            manager.setCreatedAt(LocalDateTime.now());
            manager.setUpdatedAt(LocalDateTime.now());
            
            userRepository.save(manager);
            count++;
            
            log.info("✅ Created Manager - username: manager, password: manager123");
            System.out.println("✅ Created Manager - username: manager, password: manager123");
        } else {
            log.info("Manager already exists");
        }
        
        log.info("User initialization completed. Created {} users", count);
        return count;
    }
}