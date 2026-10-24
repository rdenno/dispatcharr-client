package com.rdenno.dispatcharr.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.longOrNull

/**
 * The app treats all server payloads as dynamic JSON (kotlinx JsonElement) rather than
 * strongly-typed DTOs. Dispatcharr's API is large and evolves quickly, so this keeps the
 * client resilient to added/removed fields. Use the helpers below to read values.
 */
val AppJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    explicitNulls = true
    prettyPrint = false
}

val PrettyJson = Json { prettyPrint = true }

fun JsonElement?.asObj(): JsonObject? = this as? JsonObject
fun JsonElement?.asArr(): JsonArray? = this as? JsonArray
fun JsonElement?.asPrim(): JsonPrimitive? = (this as? JsonPrimitive)?.takeIf { this !is JsonNull }

fun JsonElement?.asStr(): String? = asPrim()?.contentOrNull
fun JsonElement?.asInt(): Int? = asPrim()?.let { it.intOrNull ?: it.doubleOrNull?.toInt() }
fun JsonElement?.asLong(): Long? = asPrim()?.let { it.longOrNull ?: it.doubleOrNull?.toLong() }
fun JsonElement?.asDouble(): Double? = asPrim()?.doubleOrNull
fun JsonElement?.asBool(): Boolean? = asPrim()?.let { p ->
    p.booleanOrNull ?: when (p.contentOrNull?.lowercase()) {
        "true", "1", "yes", "on" -> true
        "false", "0", "no", "off" -> false
        else -> null
    }
}

fun JsonObject?.str(key: String): String? = this?.get(key).asStr()
fun JsonObject?.int(key: String): Int? = this?.get(key).asInt()
fun JsonObject?.long(key: String): Long? = this?.get(key).asLong()
fun JsonObject?.double(key: String): Double? = this?.get(key).asDouble()
fun JsonObject?.bool(key: String): Boolean? = this?.get(key).asBool()
fun JsonObject?.obj(key: String): JsonObject? = this?.get(key).asObj()
fun JsonObject?.arr(key: String): JsonArray? = this?.get(key).asArr()
fun JsonObject?.objList(key: String): List<JsonObject> = arr(key)?.mapNotNull { it.asObj() } ?: emptyList()
fun JsonObject?.intList(key: String): List<Int> = arr(key)?.mapNotNull { it.asInt() } ?: emptyList()
fun JsonObject?.strList(key: String): List<String> = arr(key)?.mapNotNull { it.asStr() } ?: emptyList()

/** Follows a dotted path, e.g. `o.path("custom_properties.navOrder")`. */
fun JsonElement?.path(path: String): JsonElement? {
    var cur: JsonElement? = this
    for (part in path.split('.')) {
        cur = when (cur) {
            is JsonObject -> cur[part]
            is JsonArray -> part.toIntOrNull()?.let { cur.getOrNull(it) }
            else -> null
        }
    }
    return cur
}

/** Returns list of objects whether the response is a bare array or a DRF page `{results: [...]}`. */
fun JsonElement?.resultsList(): List<JsonObject> = when (this) {
    is JsonArray -> mapNotNull { it.asObj() }
    is JsonObject -> objList("results")
    else -> emptyList()
}

/** DRF paginated `count` (falls back to list size). */
fun JsonElement?.resultsCount(): Int = when (this) {
    is JsonObject -> int("count") ?: objList("results").size
    is JsonArray -> size
    else -> 0
}

// ---------- builders ----------

/** Converts plain Kotlin values (Map, List, String, Number, Boolean, null, JsonElement) to JsonElement. */
fun Any?.toJsonElement(): JsonElement = when (this) {
    null -> JsonNull
    is JsonElement -> this
    is String -> JsonPrimitive(this)
    is Number -> JsonPrimitive(this)
    is Boolean -> JsonPrimitive(this)
    is Map<*, *> -> JsonObject(entries.associate { (k, v) -> k.toString() to v.toJsonElement() })
    is Iterable<*> -> JsonArray(map { it.toJsonElement() })
    is Array<*> -> JsonArray(map { it.toJsonElement() })
    is IntArray -> JsonArray(map { JsonPrimitive(it) })
    else -> JsonPrimitive(toString())
}

/** `jsonOf("a" to 1, "b" to listOf(1,2))` */
fun jsonOf(vararg pairs: Pair<String, Any?>): JsonObject =
    JsonObject(pairs.associate { (k, v) -> k to v.toJsonElement() })

fun JsonObject.with(vararg pairs: Pair<String, Any?>): JsonObject =
    JsonObject(this + pairs.associate { (k, v) -> k to v.toJsonElement() })

fun JsonObject.without(vararg keys: String): JsonObject = JsonObject(this - keys.toSet())

fun JsonElement.toPrettyString(): String = PrettyJson.encodeToString(JsonElement.serializer(), this)

fun parseJsonOrNull(text: String?): JsonElement? =
    if (text.isNullOrBlank()) null else runCatching { AppJson.parseToJsonElement(text) }.getOrNull()

/** Converts a primitive JsonElement to a plain Kotlin value (String/Long/Double/Boolean/null). */
fun JsonElement?.toPlain(): Any? = when (this) {
    null, JsonNull -> null
    is JsonPrimitive -> if (isString) content else booleanOrNull ?: longOrNull ?: doubleOrNull ?: content
    is JsonArray -> map { it.toPlain() }
    is JsonObject -> mapValues { it.value.toPlain() }
}
