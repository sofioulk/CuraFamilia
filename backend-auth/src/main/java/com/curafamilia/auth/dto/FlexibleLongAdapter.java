package com.curafamilia.auth.dto;

import jakarta.json.Json;
import jakarta.json.JsonNumber;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import jakarta.json.bind.adapter.JsonbAdapter;

public class FlexibleLongAdapter implements JsonbAdapter<Long, JsonValue> {
    private static final String INVALID_LONG_MESSAGE =
            "Le champ numerique doit etre un entier ou une chaine numerique valide.";

    @Override
    public JsonValue adaptToJson(Long value) {
        return value == null ? JsonValue.NULL : Json.createValue(value);
    }

    @Override
    public Long adaptFromJson(JsonValue value) {
        if (value == null || value.getValueType() == JsonValue.ValueType.NULL) {
            return null;
        }

        return switch (value.getValueType()) {
            case NUMBER -> ((JsonNumber) value).longValueExact();
            case STRING -> parseLong(((JsonString) value).getString());
            default -> throw new IllegalArgumentException(INVALID_LONG_MESSAGE);
        };
    }

    private Long parseLong(String value) {
        if (value == null) {
            return null;
        }

        String normalizedValue = value.trim();
        if (normalizedValue.isEmpty()) {
            return null;
        }

        try {
            return Long.parseLong(normalizedValue);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException(INVALID_LONG_MESSAGE, exception);
        }
    }
}
