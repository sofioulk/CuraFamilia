package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.DailyCheckinRequest;
import com.curafamilia.auth.dto.DailyCheckinResponse;
import com.curafamilia.auth.dto.HomeResponse;
import com.curafamilia.auth.dto.MedicationTakeRequest;
import com.curafamilia.auth.dto.MedicationTakeResponse;
import com.curafamilia.auth.dto.SosAlertRequest;
import com.curafamilia.auth.dto.SosAlertResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SeniorHomeService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/senior/home")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorHomeResource {
    private final SeniorHomeService seniorHomeService = new SeniorHomeService();

    @GET
    @Produces("application/json;charset=UTF-8")
    public Response getHome(@Context HttpHeaders headers,
                            @QueryParam("seniorId") Long seniorId,
                            @QueryParam("date") String date) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        HomeResponse response = seniorHomeService.getHome(actor, seniorId, date);
        return Response.ok(response).build();
    }

    @POST
    @Path("/medications/{medicationId}/take")
    @Produces("application/json;charset=UTF-8")
    public Response markMedicationTaken(@Context HttpHeaders headers,
                                        @PathParam("medicationId") Long medicationId,
                                        MedicationTakeRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        MedicationTakeResponse response = seniorHomeService.markMedicationTaken(actor, medicationId, request);
        return Response.ok(response).build();
    }

    @POST
    @Path("/checkins")
    @Produces("application/json;charset=UTF-8")
    public Response submitDailyCheckin(@Context HttpHeaders headers, DailyCheckinRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        DailyCheckinResponse response = seniorHomeService.submitDailyCheckin(actor, request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @POST
    @Path("/sos")
    @Produces("application/json;charset=UTF-8")
    public Response triggerSos(@Context HttpHeaders headers, SosAlertRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SosAlertResponse response = seniorHomeService.triggerSos(actor, request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
