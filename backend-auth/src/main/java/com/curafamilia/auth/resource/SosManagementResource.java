package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.SosAlertHistoryResponse;
import com.curafamilia.auth.dto.SosAlertResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.SosManagementService;
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

@Path("/api/family/sos")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class SosManagementResource {
    private final SosManagementService sosManagementService = new SosManagementService();

    @GET
    @Path("/history")
    public Response history(@Context HttpHeaders headers,
                            @QueryParam("seniorId") Long seniorId,
                            @QueryParam("limit") Integer limit) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SosAlertHistoryResponse response = sosManagementService.getHistory(actor, seniorId, limit);
        return Response.ok(response).build();
    }

    @POST
    @Path("/{alertId}/acknowledge")
    public Response acknowledge(@Context HttpHeaders headers, @PathParam("alertId") Long alertId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SosAlertResponse response = sosManagementService.acknowledge(actor, alertId);
        return Response.ok(response).build();
    }

    @POST
    @Path("/{alertId}/resolve")
    public Response resolve(@Context HttpHeaders headers, @PathParam("alertId") Long alertId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        SosAlertResponse response = sosManagementService.resolve(actor, alertId);
        return Response.ok(response).build();
    }
}
