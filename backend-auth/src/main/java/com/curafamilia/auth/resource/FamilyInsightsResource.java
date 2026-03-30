package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.AdherenceTrendResponse;
import com.curafamilia.auth.dto.FamilyDashboardResponse;
import com.curafamilia.auth.dto.HealthScoreResponse;
import com.curafamilia.auth.dto.MoodTrendResponse;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.FamilyInsightsService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/family/seniors")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class FamilyInsightsResource {
    private final FamilyInsightsService familyInsightsService = new FamilyInsightsService();

    @GET
    @Path("/{seniorId}/analytics/adherence")
    public Response adherence(@Context HttpHeaders headers,
                              @PathParam("seniorId") Long seniorId,
                              @QueryParam("days") Integer days) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AdherenceTrendResponse response = familyInsightsService.getAdherenceTrend(actor, seniorId, days);
        return Response.ok(response).build();
    }

    @GET
    @Path("/{seniorId}/analytics/checkins")
    public Response checkins(@Context HttpHeaders headers,
                             @PathParam("seniorId") Long seniorId,
                             @QueryParam("days") Integer days) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        MoodTrendResponse response = familyInsightsService.getMoodTrend(actor, seniorId, days);
        return Response.ok(response).build();
    }

    @GET
    @Path("/{seniorId}/analytics/health-score")
    public Response healthScore(@Context HttpHeaders headers, @PathParam("seniorId") Long seniorId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        HealthScoreResponse response = familyInsightsService.getHealthScore(actor, seniorId);
        return Response.ok(response).build();
    }

    @GET
    @Path("/{seniorId}/dashboard")
    public Response dashboard(@Context HttpHeaders headers, @PathParam("seniorId") Long seniorId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        FamilyDashboardResponse response = familyInsightsService.getDashboard(actor, seniorId);
        return Response.ok(response).build();
    }
}
