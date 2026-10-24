package com.rdenno.dispatcharr.data

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

object UserLevel {
    const val STREAMER = 0
    const val STANDARD = 1
    const val ADMIN = 10

    fun label(level: Int?): String = when (level) {
        STREAMER -> "Streamer"
        STANDARD -> "Standard User"
        ADMIN -> "Admin"
        null -> "Unknown"
        else -> "Level $level"
    }
}

enum class AuthState { Checking, LoggedOut, LoggedIn }

/**
 * App-wide session + shared lookup caches (the Android equivalent of the web UI's zustand
 * stores that `initData()` populates). Features read lookups from here for pickers
 * (e.g. channel group dropdowns) and call `refreshX()` after mutating.
 */
class Session(val api: ApiClient, val prefs: Prefs) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val _auth = MutableStateFlow(AuthState.Checking)
    val auth: StateFlow<AuthState> = _auth.asStateFlow()

    private val _user = MutableStateFlow<JsonObject?>(null)
    val user: StateFlow<JsonObject?> = _user.asStateFlow()

    /** settings keyed by `key` -> full setting object {id,key,name,value} */
    val settings = MutableStateFlow<Map<String, JsonObject>>(emptyMap())
    val environment = MutableStateFlow<JsonObject?>(null)
    val version = MutableStateFlow<JsonObject?>(null)

    val channelGroups = MutableStateFlow<List<JsonObject>>(emptyList())
    val channelProfiles = MutableStateFlow<List<JsonObject>>(emptyList())
    val playlists = MutableStateFlow<List<JsonObject>>(emptyList())
    val epgSources = MutableStateFlow<List<JsonObject>>(emptyList())
    val streamProfiles = MutableStateFlow<List<JsonObject>>(emptyList())
    val outputProfiles = MutableStateFlow<List<JsonObject>>(emptyList())
    val userAgents = MutableStateFlow<List<JsonObject>>(emptyList())
    val serverGroups = MutableStateFlow<List<JsonObject>>(emptyList())
    val users = MutableStateFlow<List<JsonObject>>(emptyList())

    val isAdmin: Boolean get() = (_user.value.int("user_level") ?: 0) >= UserLevel.ADMIN
    val userLevel: Int get() = _user.value.int("user_level") ?: 0

    /** Port of utils/dvrAccess.js: "none" | "view" | "manage". */
    fun dvrAccess(u: JsonObject? = _user.value): String {
        val lvl = u.int("user_level") ?: return "none"
        if (lvl >= UserLevel.ADMIN) return "manage"
        if (lvl < UserLevel.STANDARD) return "none"
        return when (val raw = u.obj("custom_properties").str("dvr_access")) { "none", "view", "manage" -> raw; else -> "view" }
    }
    val canManageDvr: Boolean get() = dvrAccess() == "manage"
    val canViewDvr: Boolean get() = dvrAccess() != "none"

    /** Port of utils/vodAccess.js */
    fun vodFlag(flag: String, u: JsonObject? = _user.value): Boolean {
        val lvl = u.int("user_level") ?: return false
        if (lvl >= UserLevel.ADMIN) return true
        if (lvl < UserLevel.STANDARD) return false
        return u.obj("custom_properties").bool(flag) != false
    }
    val vodMoviesEnabled: Boolean get() = vodFlag("vod_movies_enabled")
    val vodSeriesEnabled: Boolean get() = vodFlag("vod_series_enabled")
    val canViewVod: Boolean get() = vodMoviesEnabled || vodSeriesEnabled

    init {
        api.onAuthLost = { scope.launch { clearSession() } }
    }

    fun setting(key: String): JsonObject? = settings.value[key]
    fun settingValue(key: String): kotlinx.serialization.json.JsonElement? = settings.value[key]?.get("value")
    val envMode: String get() = environment.value.str("env_mode") ?: "aio"

    /** Called at startup: restore session from refresh token, or reverse-proxy login. */
    fun bootstrap() {
        scope.launch {
            if (prefs.serverUrl.isBlank()) { _auth.value = AuthState.LoggedOut; return@launch }
            val ok = runCatching {
                if (api.isLoggedIn) { api.validToken(forceRefresh = true) != null } else api.proxyLogin()
            }.getOrDefault(false)
            if (ok && runCatching { initData() }.isSuccess) _auth.value = AuthState.LoggedIn
            else _auth.value = AuthState.LoggedOut
        }
    }

    suspend fun login(server: String, username: String, password: String) {
        prefs.serverUrl = normalizeServer(server)
        prefs.lastUsername = username
        api.login(username, password)
        initData()
        _auth.value = AuthState.LoggedIn
    }

    suspend fun logout() {
        api.logout()
        clearSession()
    }

    private fun clearSession() {
        prefs.clearTokens()
        _user.value = null
        _auth.value = AuthState.LoggedOut
    }

    /** Mirrors web `initData()`: load user + settings + shared lookups. */
    suspend fun initData() {
        val me = api.get("/api/accounts/users/me/").asObj()
            ?: throw ApiException(0, null, null, "Could not load user")
        if ((me.int("user_level") ?: 0) <= UserLevel.STREAMER) {
            throw ApiException(403, null, null, "Streamer accounts cannot use the management UI")
        }
        _user.value = me
        refreshSettings()
        coroutineScope {
            listOf(
                async { refreshChannelGroups() },
                async { refreshChannelProfiles() },
                async { refreshPlaylists() },
                async { refreshEpgSources() },
                async { refreshStreamProfiles() },
                async { refreshOutputProfiles() },
                async { refreshUserAgents() },
                async { refreshServerGroups() },
                async { if (isAdmin) refreshUsers() },
            ).awaitAll()
        }
    }

    suspend fun refreshMe() { api.get("/api/accounts/users/me/").asObj()?.let { _user.value = it } }

    /** PATCH /users/me/ ; backend merges custom_properties. */
    suspend fun updateMe(data: Map<String, Any?>): JsonObject? {
        val res = api.patch("/api/accounts/users/me/", data).asObj()
        if (res != null) _user.value = res
        return res
    }

    suspend fun updateUserPreferences(prefs: Map<String, Any?>) = updateMe(mapOf("custom_properties" to prefs))

    suspend fun refreshSettings() {
        val list = runCatching { api.get("/api/core/settings/").resultsList() }.getOrDefault(emptyList())
        settings.value = list.associateBy { it.str("key") ?: "" }
        environment.value = runCatching { api.get("/api/core/settings/env/").asObj() }.getOrNull()
        if (version.value == null) version.value = runCatching { api.get("/api/core/version/").asObj() }.getOrNull()
    }

    /** Create or update a setting by key (web: updateSetting/createSetting). */
    suspend fun saveSetting(key: String, value: Any?, name: String? = null): JsonObject? {
        val existing = settings.value[key]
        val res = if (existing != null) {
            api.put("/api/core/settings/${existing.int("id")}/", mapOf("key" to key, "name" to (existing.str("name") ?: name ?: key), "value" to value)).asObj()
        } else {
            api.post("/api/core/settings/", mapOf("key" to key, "name" to (name ?: key), "value" to value)).asObj()
        }
        if (res != null) settings.value = settings.value + (key to res)
        return res
    }

    suspend fun refreshChannelGroups() { channelGroups.value = safeList("/api/channels/groups/") }
    suspend fun refreshChannelProfiles() { channelProfiles.value = safeList("/api/channels/profiles/") }
    suspend fun refreshPlaylists() { playlists.value = safeList("/api/m3u/accounts/") }
    suspend fun refreshEpgSources() { epgSources.value = safeList("/api/epg/sources/") }
    suspend fun refreshStreamProfiles() { streamProfiles.value = safeList("/api/core/streamprofiles/") }
    suspend fun refreshOutputProfiles() { outputProfiles.value = safeList("/api/core/outputprofiles/") }
    suspend fun refreshUserAgents() { userAgents.value = safeList("/api/core/useragents/") }
    suspend fun refreshServerGroups() { serverGroups.value = safeList("/api/m3u/server-groups/") }
    suspend fun refreshUsers() { users.value = safeList("/api/accounts/users/") }

    private suspend fun safeList(path: String): List<JsonObject> =
        runCatching { api.get(path).resultsList() }.getOrDefault(emptyList())

    companion object {
        fun normalizeServer(input: String): String {
            var s = input.trim().trimEnd('/')
            if (s.isNotEmpty() && !s.startsWith("http://") && !s.startsWith("https://")) s = "http://$s"
            return s
        }
    }
}
