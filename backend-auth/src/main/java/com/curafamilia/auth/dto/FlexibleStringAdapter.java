package com.curafamilia.auth.dto;

import jakarta.json.Json;
import jakarta.json.JsonNumber;
import jakarta.json.JsonString;
import jakarta.json.JsonValue;
import jakarta.json.bind.adapter.JsonbAdapter;

public class FlexibleStringAdapter implements JsonbAdapter<String, JsonValue> {
    private static final String INVALID_STRING_MESSAGE =
            "Le champ texte doit etre une chaine, un nombre ou un booleen.";

    @Override
    public JsonValue adaptToJson(String value) {
        return value == null ? JsonValue.NULL : Json.createValue(value);
    }

    @Override
    public String adaptFromJson(JsonValue value) {
        if (value == null || value.getValueType() == JsonValue.ValueType.NULL) {
            return null;
        }

        return switch (value.getValueType()) {
            case STRING -> ((JsonString) value).getString();
            case NUMBER -> ((JsonNumber) value).toString();
            case TRUE -> Boolean.TRUE.toString();
            case FALSE -> Boolean.FALSE.toString();
            default -> throw new IllegalArgumentException(INVALID_STRING_MESSAGE);
        };
    }
}
