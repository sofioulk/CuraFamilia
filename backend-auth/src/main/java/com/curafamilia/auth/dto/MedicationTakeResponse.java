package com.curafamilia.auth.dto;

public class MedicationTakeResponse {
    private String message;
    private TakeData take;

    public MedicationTakeResponse() {
    }

    public MedicationTakeResponse(String message, TakeData take) {
        this.message = message;
        this.take = take;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public TakeData getTake() {
        return take;
    }

    public void setTake(TakeData take) {
        this.take = take;
    }

    public static class TakeData {
        private Long medicationId;
        private Long seniorId;
        private String scheduledAt;
        private String takenAt;
        private String status;

        public TakeData() {
        }

        public TakeData(Long medicationId, Long seniorId, String scheduledAt, String takenAt, String status) {
            this.medicationId = medicationId;
            this.seniorId = seniorId;
            this.scheduledAt = scheduledAt;
            this.takenAt = takenAt;
            this.status = status;
        }

        public Long getMedicationId() {
            return medicationId;
        }

        public void setMedicationId(Long medicationId) {
            this.medicationId = medicationId;
        }

        public Long getSeniorId() {
            return seniorId;
        }

        public void setSeniorId(Long seniorId) {
            this.seniorId = seniorId;
        }

        public String getScheduledAt() {
            return scheduledAt;
        }

        public void setScheduledAt(String scheduledAt) {
            this.scheduledAt = scheduledAt;
        }

        public String getTakenAt() {
            return takenAt;
        }

        public void setTakenAt(String takenAt) {
            this.takenAt = takenAt;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }
    }
}
