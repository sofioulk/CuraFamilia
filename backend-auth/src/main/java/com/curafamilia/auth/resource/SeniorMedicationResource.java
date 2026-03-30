package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.SeniorMedicationsResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SeniorMedicationService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/senior/medications")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorMedicationResource {
    private final SeniorMedicationService seniorMedicationService = new SeniorMedicationService();

    @GET
    @Produces("application/json;charset=UTF-8")
    public Response getMedications(@Context HttpHeaders headers,
                                   @QueryParam("seniorId") Long seniorId,
                                   @QueryParam("period") String period) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SeniorMedicationsResponse response = seniorMedicationService.getMedications(actor, seniorId, period);
        return Response.ok(response).build();
    }
}
