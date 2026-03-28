package com.curafamilia.auth.config;

import com.curafamilia.auth.exception.ApiExceptionMapper;
import com.curafamilia.auth.exception.GenericExceptionMapper;
import com.curafamilia.auth.resource.AuthResource;
import com.curafamilia.auth.resource.SeniorAssistantResource;
import com.curafamilia.auth.resource.SeniorHomeResource;
import com.curafamilia.auth.resource.SeniorMedicationResource;
import com.curafamilia.auth.resource.SeniorProfileResource;
import org.glassfish.jersey.jsonb.JsonBindingFeature;
import org.glassfish.jersey.server.ResourceConfig;

public class AppConfig extends ResourceConfig {
    public AppConfig() {
        // Explicit registrations avoid package-scan misses in some Jetty/Jersey runs.
        register(JsonBindingFeature.class);
        register(AuthResource.class);
        register(SeniorAssistantResource.class);
        register(SeniorHomeResource.class);
        register(SeniorMedicationResource.class);
        register(SeniorProfileResource.class);
        register(ApiExceptionMapper.class);
        register(GenericExceptionMapper.class);
    }
}
