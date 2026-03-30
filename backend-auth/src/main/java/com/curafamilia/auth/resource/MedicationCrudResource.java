package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.MedicationCrudResponse;
import com.curafamilia.auth.dto.MedicationWriteRequest;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.MedicationCrudService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/medications")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class MedicationCrudResource {
    private final MedicationCrudService medicationCrudService = new MedicationCrudService();

    @POST
    public Response create(@Context HttpHeaders headers, MedicationWriteRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        MedicationCrudResponse response = medicationCrudService.createMedication(actor, request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @PUT
    @Path("/{medicationId}")
    public Response update(@Context HttpHeaders headers,
                           @PathParam("medicationId") Long medicationId,
                           MedicationWriteRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        MedicationCrudResponse response = medicationCrudService.updateMedication(actor, medicationId, request);
        return Response.ok(response).build();
    }

    @DELETE
    @Path("/{medicationId}")
    public Response delete(@Context HttpHeaders headers,
                           @PathParam("medicationId") Long medicationId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        MedicationCrudResponse response = medicationCrudService.deleteMedication(actor, medicationId);
        return Response.ok(response).build();
    }
}
