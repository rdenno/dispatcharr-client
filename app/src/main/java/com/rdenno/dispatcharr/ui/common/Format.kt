package com.rdenno.dispatcharr.ui.common

import java.time.Duration
import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

object Fmt {
    private val dateTime = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT)
    private val date = DateTimeFormatter.ofLocalizedDate(FormatStyle.MEDIUM)
    private val time = DateTimeFormatter.ofLocalizedTime(FormatStyle.SHORT)

    /** Parses ISO-8601 timestamps from the API (with offset or 'Z'). */
    fun parse(iso: String?): ZonedDateTime? {
        if (iso.isNullOrBlank()) return null
        return runCatching { OffsetDateTime.parse(iso).atZoneSameInstant(ZoneId.systemDefault()) }.getOrNull()
            ?: runCatching { Instant.parse(iso).atZone(ZoneId.systemDefault()) }.getOrNull()
            ?: runCatching { java.time.LocalDateTime.parse(iso).atZone(ZoneId.systemDefault()) }.getOrNull()
    }

    fun dateTime(iso: String?): String = parse(iso)?.format(dateTime) ?: (iso ?: "—")
    fun date(iso: String?): String = parse(iso)?.format(date) ?: (iso ?: "—")
    fun time(iso: String?): String = parse(iso)?.format(time) ?: (iso ?: "—")
    fun timeRange(start: String?, end: String?): String = "${time(start)} – ${time(end)}"

    fun epochSeconds(s: Long?): String =
        s?.let { Instant.ofEpochSecond(it).atZone(ZoneId.systemDefault()).format(dateTime) } ?: "—"

    /** "2h 05m", "4m 12s" */
    fun duration(seconds: Long?): String {
        if (seconds == null || seconds < 0) return "—"
        val h = seconds / 3600; val m = (seconds % 3600) / 60; val s = seconds % 60
        return when {
            h > 0 -> String.format(Locale.US, "%dh %02dm", h, m)
            m > 0 -> String.format(Locale.US, "%dm %02ds", m, s)
            else -> "${s}s"
        }
    }

    /** Relative "5 min ago" / "in 2 h". */
    fun relative(iso: String?): String {
        val t = parse(iso) ?: return "—"
        val d = Duration.between(ZonedDateTime.now(), t)
        val past = d.isNegative
        val abs = d.abs()
        val txt = when {
            abs.toMinutes() < 1 -> return "just now"
            abs.toHours() < 1 -> "${abs.toMinutes()} min"
            abs.toDays() < 1 -> "${abs.toHours()} h"
            else -> "${abs.toDays()} d"
        }
        return if (past) "$txt ago" else "in $txt"
    }

    fun bytes(b: Long?): String {
        if (b == null) return "—"
        val units = listOf("B", "KB", "MB", "GB", "TB")
        var v = b.toDouble(); var i = 0
        while (v >= 1024 && i < units.size - 1) { v /= 1024; i++ }
        return if (i == 0) "$b B" else String.format(Locale.US, "%.1f %s", v, units[i])
    }

    /** bits/sec or kbps formatting */
    fun bitrate(kbps: Double?): String {
        if (kbps == null) return "—"
        return if (kbps >= 1000) String.format(Locale.US, "%.1f Mbps", kbps / 1000) else String.format(Locale.US, "%.0f kbps", kbps)
    }
}
