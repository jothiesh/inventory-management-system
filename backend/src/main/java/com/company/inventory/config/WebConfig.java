package com.company.inventory.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;

@Configuration
@Slf4j // <-- Lombok annotation to inject the 'log' field automatically
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        log.info("Initializing Spring MVC Static Resource Handling Configurations.");

        // 1. Serve /assets/** (Vite build - JS, CSS)
        int cachePeriodSeconds = 31536000;
        log.debug("Registering resource handler for '/assets/**' mapping to 'classpath:/static/assets/' with cache period: {}s", cachePeriodSeconds);
        registry.addResourceHandler("/assets/**")
                .addResourceLocations("classpath:/static/assets/")
                .setCachePeriod(cachePeriodSeconds)
                .resourceChain(true);

        // 2. Serve static files only
        log.debug("Registering root level standalone static resource endpoints mapping onto 'classpath:/static/' asset root.");
        registry.addResourceHandler(
                        "/favicon.ico", "/thinlogo.png", "/vite.svg",
                        "/*.png", "/*.ico", "/*.svg", "/*.js", "/*.css",
                        "/index.html"
                )
                .addResourceLocations("classpath:/static/")
                .resourceChain(true);
    }

    // Forward all React Router paths to index.html
    // /api/** is NOT listed here so Spring controllers handle it normally
    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        log.info("Registering Single Page Application (SPA) view forward controllers intercept paths layers.");
        
        String[] routes = {
            "/",
            "/login",
            "/dashboard",
            "/categories",
            "/products",
            "/racks",
            "/suppliers",
            "/stock-in",
            "/stock-out",
            "/current-stock",
            "/alerts",
            "/reports",
            "/excel-import",
            "/purchase-orders",
            "/purchase-orders/new",
            "/purchase-requests",
            "/purchase-requests/new",
        };
        
        log.debug("Wiring {} browser client routes straight to 'forward:/index.html' landing assets engine mappings.", routes.length);
        for (String route : routes) {
            log.trace("Mapping SPA Browser Route Interceptor Context: '{}'", route);
            registry.addViewController(route).setViewName("forward:/index.html");
        }

        // Wildcard routes with ID params — Spring MVC ViewControllers
        // don't support wildcards, so handle these via a controller
        // OR just add the index.html fallback pattern below
        log.info("Single Page Application (SPA) fallback routing registration completed safely.");
    }
}