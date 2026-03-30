package com.curafamilia.auth.dto;

public class AppointmentCrudResponse {
    private String message;
    private AppointmentDto appointment;

    public AppointmentCrudResponse() {
    }

    public AppointmentCrudResponse(String message, AppointmentDto appointment) {
        this.message = message;
        this.appointment = appointment;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public AppointmentDto getAppointment() {
        return appointment;
    }

    public void setAppointment(AppointmentDto appointment) {
        this.appointment = appointment;
    }
}
