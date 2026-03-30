package com.curafamilia.auth.resource;

import com.curafamilia.auth.dto.AppointmentCrudResponse;
import com.curafamilia.auth.dto.AppointmentWriteRequest;
import com.curafamilia.auth.security.AuthContextResolver;
import com.curafamilia.auth.security.AuthenticatedUser;
import com.curafamilia.auth.service.AppointmentCrudService;
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

@Path("/api/appointments")
@Consumes(MediaType.APPLICATION_JSON)
@Produces("application/json;charset=UTF-8")
public class AppointmentCrudResource {
    private final AppointmentCrudService appointmentCrudService = new AppointmentCrudService();

    @POST
    public Response create(@Context HttpHeaders headers, AppointmentWriteRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AppointmentCrudResponse response = appointmentCrudService.createAppointment(actor, request);
        return Response.status(Response.Status.CREATED).entity(response).build();
    }

    @PUT
    @Path("/{appointmentId}")
    public Response update(@Context HttpHeaders headers,
                           @PathParam("appointmentId") Long appointmentId,
                           AppointmentWriteRequest request) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AppointmentCrudResponse response = appointmentCrudService.updateAppointment(actor, appointmentId, request);
        return Response.ok(response).build();
    }

    @DELETE
    @Path("/{appointmentId}")
    public Response delete(@Context HttpHeaders headers,
                           @PathParam("appointmentId") Long appointmentId) {
        AuthenticatedUser actor = AuthContextResolver.requireAuthenticatedUser(headers);
        AppointmentCrudResponse response = appointmentCrudService.deleteAppointment(actor, appointmentId);
        return Response.ok(response).build();
    }
}
