package com.rdenno.dispatcharr.data

import android.content.Context
import android.content.SharedPreferences
import androidx.core.content.edit

/** Simple persisted preferences: server URL + JWT tokens + local UI prefs. */
class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.getSharedPreferences("dispatcharr", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = sp.getString("server_url", "") ?: ""
        set(v) = sp.edit { putString("server_url", v.trim().trimEnd('/')) }

    var lastUsername: String
        get() = sp.getString("last_username", "") ?: ""
        set(v) = sp.edit { putString("last_username", v) }

    var accessToken: String?
        get() = sp.getString("access_token", null)
        set(v) = sp.edit { putString("access_token", v) }

    var refreshToken: String?
        get() = sp.getString("refresh_token", null)
        set(v) = sp.edit { putString("refresh_token", v) }

    /** Unix seconds when [accessToken] expires. */
    var tokenExpiration: Long
        get() = sp.getLong("token_exp", 0L)
        set(v) = sp.edit { putLong("token_exp", v) }

    fun clearTokens() = sp.edit {
        remove("access_token"); remove("refresh_token"); remove("token_exp")
    }

    // Generic local key/value storage for per-feature UI preferences
    fun getString(key: String, def: String? = null): String? = sp.getString("ui_$key", def)
    fun putString(key: String, value: String?) = sp.edit { putString("ui_$key", value) }
    fun getBool(key: String, def: Boolean = false): Boolean = sp.getBoolean("ui_$key", def)
    fun putBool(key: String, value: Boolean) = sp.edit { putBoolean("ui_$key", value) }
    fun getInt(key: String, def: Int = 0): Int = sp.getInt("ui_$key", def)
    fun putInt(key: String, value: Int) = sp.edit { putInt("ui_$key", value) }
}
