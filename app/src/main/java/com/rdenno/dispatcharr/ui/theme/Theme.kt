package com.rdenno.dispatcharr.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Colours lifted from the Dispatcharr web UI's mantineTheme.jsx (Tailwind zinc palette + teal)
object DColors {
    val Background = Color(0xFF18181B)   // zinc-900
    val Surface = Color(0xFF27272A)      // zinc-800
    val SurfaceHigh = Color(0xFF3F3F46)  // zinc-700
    val Border = Color(0xFF3F3F46)
    val Teal = Color(0xFF14917E)         // buttonPrimary
    val TealLight = Color(0xFF2DD4BF)
    val Blue = Color(0xFF4A90E2)
    val Orange = Color(0xFFF5A623)
    val Green = Color(0xFF90C43E)
    val SuccessIcon = Color(0xFF05DF72)
    val Red = Color(0xFFEF4444)
    val Yellow = Color(0xFFEAB308)
    val Indigo = Color(0xFF4F39F6)
    val TextSecondary = Color(0xFFD4D4D8)
    val TextMuted = Color(0xFFA0A0A0)
}

private val Scheme = darkColorScheme(
    primary = DColors.Teal,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF0F5E52),
    onPrimaryContainer = Color.White,
    secondary = DColors.Blue,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF1E3A5F),
    onSecondaryContainer = Color.White,
    tertiary = DColors.Orange,
    onTertiary = Color.Black,
    background = DColors.Background,
    onBackground = Color.White,
    surface = DColors.Background,
    onSurface = Color.White,
    surfaceVariant = DColors.Surface,
    onSurfaceVariant = DColors.TextSecondary,
    surfaceContainer = DColors.Surface,
    surfaceContainerLow = Color(0xFF1F1F23),
    surfaceContainerLowest = DColors.Background,
    surfaceContainerHigh = Color(0xFF2E2E33),
    surfaceContainerHighest = DColors.SurfaceHigh,
    outline = Color(0xFF5F5F66),
    outlineVariant = DColors.Border,
    error = DColors.Red,
    onError = Color.White,
)

@Composable
fun DispatcharrTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Scheme, content = content)
}
