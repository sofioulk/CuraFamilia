package com.curafamilia.auth.dto;

public class MedicationWriteRequest {
    private Long seniorId;
    private String name;
    private String dosage;
    private String time;
    private String frequency;
    private String period;
    private String instruction;
    private Boolean active;

    public Long getSeniorId() {
        return seniorId;
    }

    public void setSeniorId(Long seniorId) {
        this.seniorId = seniorId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDosage() {
        return dosage;
    }

    public void setDosage(String dosage) {
        this.dosage = dosage;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }

    public String getFrequency() {
        return frequency;
    }

    public void setFrequency(String frequency) {
        this.frequency = frequency;
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public String getInstruction() {
        return instruction;
    }

    public void setInstruction(String instruction) {
        this.instruction = instruction;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
