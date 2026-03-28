package com.curafamilia.auth.dto;

import java.util.List;

public class SeniorMedicationsResponse {
    private int count;
    private int takenCount;
    private String period;
    private List<MedicationItem> medications;

    public SeniorMedicationsResponse() {
    }

    public SeniorMedicationsResponse(int count, int takenCount, String period, List<MedicationItem> medications) {
        this.count = count;
        this.takenCount = takenCount;
        this.period = period;
        this.medications = medications;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public int getTakenCount() {
        return takenCount;
    }

    public void setTakenCount(int takenCount) {
        this.takenCount = takenCount;
    }

    public String getPeriod() {
        return period;
    }

    public void setPeriod(String period) {
        this.period = period;
    }

    public List<MedicationItem> getMedications() {
        return medications;
    }

    public void setMedications(List<MedicationItem> medications) {
        this.medications = medications;
    }

    public static class MedicationItem {
        private Long id;
        private String name;
        private String dosage;
        private String period;
        private String time;
        private String frequency;
        private String instruction;
        private boolean active;
        private String status;
        private String takenAt;

        public MedicationItem() {
        }

        public MedicationItem(Long id, String name, String dosage, String period, String time,
                              String frequency, String instruction, boolean active,
                              String status, String takenAt) {
            this.id = id;
            this.name = name;
            this.dosage = dosage;
            this.period = period;
            this.time = time;
            this.frequency = frequency;
            this.instruction = instruction;
            this.active = active;
            this.status = status;
            this.takenAt = takenAt;
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
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

        public String getPeriod() {
            return period;
        }

        public void setPeriod(String period) {
            this.period = period;
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

        public String getInstruction() {
            return instruction;
        }

        public void setInstruction(String instruction) {
            this.instruction = instruction;
        }

        public boolean isActive() {
            return active;
        }

        public void setActive(boolean active) {
            this.active = active;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public String getTakenAt() {
            return takenAt;
        }

        public void setTakenAt(String takenAt) {
            this.takenAt = takenAt;
        }
    }
}
