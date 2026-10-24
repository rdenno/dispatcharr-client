package com.rdenno.dispatcharr.data

import android.util.Base64
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import okhttp3.HttpUrl
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import java.util.concurrent.TimeUnit

/** Thrown for any non-2xx response. [body] is parsed JSON when possible. */
class ApiException(
    val status: Int,
    val body: JsonElement?,
    val rawBody: String?,
    msg: String,
) : Exception(msg) {
    /** Human readable message mirroring the web UI's `formatApiError`. */
    val friendly: String get() = formatApiError(body, rawBody, status)
}

fun formatApiError(body: JsonElement?, raw: String?, status: Int): String {
    when (body) {
        is JsonObject -> {
            for (k in listOf("detail", "error", "message", "non_field_errors")) {
                val v = body[k]
                v.asStr()?.let { return it }
                v.asArr()?.mapNotNull { it.asStr() }?.takeIf { it.isNotEmpty() }?.let { return it.joinToString("; ") }
            }
            val parts = body.entries.mapNotNull { (k, v) ->
                val m = when (v) {
                    is JsonArray -> v.joinToString(", ") { it.asStr() ?: it.toString() }
                    else -> v.asStr() ?: v.toString()
                }
                "$k: $m"
            }
            if (parts.isNotEmpty()) return parts.joinToString("; ")
        }
        is JsonArray -> return body.joinToString("; ") { it.asStr() ?: it.toString() }
        else -> {}
    }
    val r = raw?.takeIf { it.isNotBlank() && it.length < 300 && !it.trimStart().startsWith("<") }
    return r ?: "HTTP $status"
}

/** File part for multipart uploads. */
class FilePart(val field: String, val fileName: String, val bytes: ByteArray, val mime: String = "application/octet-stream")

/**
 * Thin HTTP client for the Dispatcharr REST API using JWT auth (same flow as the web UI:
 * POST /api/accounts/token/ -> {access, refresh}; refresh at /api/accounts/token/refresh/).
 *
 * All methods are main-safe suspend functions returning dynamic JSON.
 */
class ApiClient(private val prefs: Prefs) {

    /** Invoked when refresh fails and the user must log in again. */
    var onAuthLost: (() -> Unit)? = null

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .writeTimeout(300, TimeUnit.SECONDS)
        .build()

    /** Client that injects the current bearer token; used by Coil + Media3. */
    val authedHttp: OkHttpClient = http.newBuilder()
        .addInterceptor { chain ->
            val req = chain.request()
            val token = prefs.accessToken
            val base = baseUrl.toHttpUrlOrNull()
            val sameHost = base != null && req.url.host == base.host
            if (token != null && sameHost && req.header("Authorization") == null) {
                chain.proceed(req.newBuilder().header("Authorization", "Bearer $token").build())
            } else chain.proceed(req)
        }
        .build()

    private val refreshMutex = Mutex()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    val baseUrl: String get() = prefs.serverUrl

    val isLoggedIn: Boolean get() = prefs.refreshToken != null

    /** Turns a server-relative path (e.g. `/proxy/ts/stream/uuid`) into an absolute URL. */
    fun absoluteUrl(path: String?): String? {
        if (path.isNullOrBlank()) return null
        if (path.startsWith("http://") || path.startsWith("https://")) return path
        return baseUrl + (if (path.startsWith("/")) path else "/$path")
    }

    fun currentAccessToken(): String? = prefs.accessToken

    // ------------------------------------------------------------------ auth

    suspend fun login(username: String, password: String) {
        val res = request("POST", "/api/accounts/token/", jsonOf("username" to username, "password" to password), auth = false).asObj()
        storeTokens(res.str("access"), res.str("refresh"))
    }

    /** Tries reverse-proxy header auth (web: proxyLogin). Returns true if tokens were issued. */
    suspend fun proxyLogin(): Boolean = runCatching {
        val res = request("POST", "/api/accounts/auth/proxy-login/", null, auth = false).asObj()
        val access = res.str("access") ?: return false
        storeTokens(access, res.str("refresh")); true
    }.getOrDefault(false)

    suspend fun logout() {
        runCatching { request("POST", "/api/accounts/auth/logout/", null) }
        prefs.clearTokens()
    }

    private fun storeTokens(access: String?, refresh: String?) {
        if (access == null) throw ApiException(0, null, null, "No access token returned")
        prefs.accessToken = access
        if (refresh != null) prefs.refreshToken = refresh
        prefs.tokenExpiration = decodeExp(access)
    }

    private fun decodeExp(token: String): Long = runCatching {
        val payload = token.split(".")[1]
        val json = String(Base64.decode(payload, Base64.URL_SAFE or Base64.NO_PADDING or Base64.NO_WRAP))
        parseJsonOrNull(json).asObj().long("exp") ?: 0L
    }.getOrDefault(0L)

    /** Returns a valid access token, refreshing if expired. Null if not logged in. */
    suspend fun validToken(forceRefresh: Boolean = false): String? = refreshMutex.withLock {
        val now = System.currentTimeMillis() / 1000
        val token = prefs.accessToken
        if (!forceRefresh && token != null && prefs.tokenExpiration - 15 > now) return token
        val refresh = prefs.refreshToken ?: return token
        try {
            val res = request("POST", "/api/accounts/token/refresh/", jsonOf("refresh" to refresh), auth = false).asObj()
            storeTokens(res.str("access"), res.str("refresh"))
            prefs.accessToken
        } catch (e: ApiException) {
            if (e.status == 401 || e.status == 400) {
                prefs.clearTokens()
                onAuthLost?.invoke()
            }
            throw e
        }
    }

    // ------------------------------------------------------------------ requests

    suspend fun get(path: String, query: Map<String, Any?> = emptyMap()): JsonElement? =
        request("GET", path, null, query)

    suspend fun post(path: String, body: Any? = null, query: Map<String, Any?> = emptyMap()): JsonElement? =
        request("POST", path, body, query)

    suspend fun put(path: String, body: Any? = null, query: Map<String, Any?> = emptyMap()): JsonElement? =
        request("PUT", path, body, query)

    suspend fun patch(path: String, body: Any? = null, query: Map<String, Any?> = emptyMap()): JsonElement? =
        request("PATCH", path, body, query)

    suspend fun delete(path: String, body: Any? = null, query: Map<String, Any?> = emptyMap()): JsonElement? =
        request("DELETE", path, body, query)

    /**
     * Generic JSON request. [body] may be a JsonElement or plain Kotlin Map/List (converted).
     * [query] values that are null are skipped; Lists are added as repeated params.
     */
    suspend fun request(
        method: String,
        path: String,
        body: Any?,
        query: Map<String, Any?> = emptyMap(),
        auth: Boolean = true,
    ): JsonElement? {
        val reqBody = when {
            body != null -> AppJson.encodeToString(JsonElement.serializer(), body.toJsonElement()).toRequestBody(jsonType)
            method == "GET" || method == "DELETE" -> null
            else -> "".toRequestBody(null)
        }
        val text = execute(method, path, query, reqBody, auth).use { it.body?.string() }
        return parseJsonOrNull(text)
    }

    /** Multipart form upload (files + string fields). */
    suspend fun multipart(
        path: String,
        fields: Map<String, Any?> = emptyMap(),
        files: List<FilePart> = emptyList(),
        method: String = "POST",
    ): JsonElement? {
        val builder = MultipartBody.Builder().setType(MultipartBody.FORM)
        fields.forEach { (k, v) -> if (v != null) builder.addFormDataPart(k, v.toString()) }
        files.forEach { f -> builder.addFormDataPart(f.field, f.fileName, f.bytes.toRequestBody(f.mime.toMediaType())) }
        val text = execute(method, path, emptyMap(), builder.build(), true).use { it.body?.string() }
        return parseJsonOrNull(text)
    }

    /** GET returning raw text (e.g. log files, M3U output). */
    suspend fun getText(path: String, query: Map<String, Any?> = emptyMap()): String =
        execute("GET", path, query, null, true).use { it.body?.string() ?: "" }

    /** GET returning raw bytes (downloads). */
    suspend fun getBytes(path: String, query: Map<String, Any?> = emptyMap()): ByteArray =
        execute("GET", path, query, null, true).use { it.body?.bytes() ?: ByteArray(0) }

    fun buildUrl(path: String, query: Map<String, Any?> = emptyMap()): HttpUrl {
        val full = absoluteUrl(path) ?: throw ApiException(0, null, null, "No server configured")
        val url = full.toHttpUrlOrNull() ?: throw ApiException(0, null, null, "Invalid server URL: $full")
        val b = url.newBuilder()
        query.forEach { (k, v) ->
            when (v) {
                null -> {}
                is Iterable<*> -> v.forEach { item -> if (item != null) b.addQueryParameter(k, item.toString()) }
                else -> b.addQueryParameter(k, v.toString())
            }
        }
        return b.build()
    }

    private suspend fun execute(
        method: String,
        path: String,
        query: Map<String, Any?>,
        body: RequestBody?,
        auth: Boolean,
        retried: Boolean = false,
    ): Response = withContext(Dispatchers.IO) {
        val url = buildUrl(path, query)
        val rb = Request.Builder().url(url).method(method, body)
            .header("Accept", "application/json")
        if (auth) validToken()?.let { rb.header("Authorization", "Bearer $it") }
        val res = http.newCall(rb.build()).execute()
        if (res.isSuccessful) return@withContext res
        val raw = res.body?.string()
        res.close()
        if (res.code == 401 && auth && !retried && prefs.refreshToken != null) {
            validToken(forceRefresh = true)
            return@withContext execute(method, path, query, body, auth, retried = true)
        }
        val parsed = parseJsonOrNull(raw)
        throw ApiException(res.code, parsed, raw, formatApiError(parsed, raw, res.code))
    }
}
