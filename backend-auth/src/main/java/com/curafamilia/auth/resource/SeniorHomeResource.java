package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.DailyCheckinRequest;
import com.curafamilia.auth.dto.DailyCheckinResponse;
import com.curafamilia.auth.dto.HomeResponse;
import com.curafamilia.auth.dto.MedicationTakeRequest;
import com.curafamilia.auth.dto.MedicationTakeResponse;
import com.curafamilia.auth.dto.SosAlertRequest;
import com.curafamilia.auth.dto.SosAlertResponse;
import com.curafamilia.auth.service.SeniorHomeService;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/senior/home")
@Consumes(MediaType.APPLICATION_JSON)
public class SeniorHomeResource {
    private final SeniorHomeService seniorHomeService = new SeniorHomeService();

    @GET
    @Produces("application/json;charset=UTF-8")
    public Response getHome(@QueryParam("seniorId") Long seniorId,
                            @QueryParam("date") String date) {
        HomeResponse response = seniorHomeService.getHome(seniorId, date);
        return Response.ok(response).build();
    }

    @POST
    @Path("/medications/{medicationId}/take")
    @Produces("application/json;charset=UTF-8")
    public Response markMedicationTaken(@PathParam("medicationId") Long medicationId,
                                        MedicationTakeRequest request) {
        MedicationTakeResponse response = seniorHomeService.markMedicationTaken(medicationId, request);
        return Response.ok(response).build();
    }

    @POST
    @Path("/checkins")
    @Produces("application/json;charset=UTF-8")
    public Response submitDailyCheckin(DailyCheckinRequest request) {
        DailyCheckinResponse response = seniorHomeService.submitDailyCheckin(request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @POST
    @Path("/sos")
    @Produces("application/json;charset=UTF-8")
    public Response triggerSos(SosAlertRequest request) {
        SosAlertResponse response = seniorHomeService.triggerSos(request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }
}
