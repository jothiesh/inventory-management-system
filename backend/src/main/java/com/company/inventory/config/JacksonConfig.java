package com.company.inventory.config;

import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public Hibernate6Module jacksonHibernate6Module() {
        Hibernate6Module module = new Hibernate6Module();
        // This configuration tells Jackson: "If a property is LAZY and uninitialized, 
        // just serialize it as null/omit it instead of blowing up."
        module.configure(Hibernate6Module.Feature.FORCE_LAZY_LOADING, false);
        return module;
    }
}