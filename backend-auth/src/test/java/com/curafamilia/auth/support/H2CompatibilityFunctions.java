package com.curafamilia.auth.support;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

public final class H2CompatibilityFunctions {
    private H2CompatibilityFunctions() {
    }

    public static Long lastInsertId(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery("SELECT SCOPE_IDENTITY()")) {
            if (resultSet.next()) {
                return resultSet.getLong(1);
            }
            return 0L;
        }
    }
}
