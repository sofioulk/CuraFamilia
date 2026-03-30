package com.curafamilia.auth.config;

import com.curafamilia.auth.exception.ApiExceptionMapper;
import com.curafamilia.auth.exception.GenericExceptionMapper;
import com.curafamilia.auth.resource.AppointmentCrudResource;
import com.curafamilia.auth.resource.AuthResource;
import com.curafamilia.auth.resource.FamilyInsightsResource;
import com.curafamilia.auth.resource.LinkResource;
import com.curafamilia.auth.resource.MedicationCrudResource;
import com.curafamilia.auth.resource.SeniorApiResource;
import com.curafamilia.auth.resource.SeniorAssistantResource;
import com.curafamilia.auth.resource.SeniorHomeResource;
import com.curafamilia.auth.resource.SeniorMedicationResource;
import com.curafamilia.auth.resource.SeniorProfileResource;
import com.curafamilia.auth.resource.SosManagementResource;
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
        register(LinkResource.class);
        register(MedicationCrudResource.class);
        register(AppointmentCrudResource.class);
        register(SeniorApiResource.class);
        register(FamilyInsightsResource.class);
        register(SosManagementResource.class);
        register(ApiExceptionMapper.class);
        register(GenericExceptionMapper.class);
    }
}
