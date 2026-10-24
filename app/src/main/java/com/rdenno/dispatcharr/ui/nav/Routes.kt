package com.rdenno.dispatcharr.ui.nav

import android.net.Uri
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ListAlt
import androidx.compose.material.icons.automirrored.filled.ShowChart
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.Subject
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material.icons.filled.Webhook
import androidx.compose.material.icons.filled.Computer
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController

/** Top-level destinations (mirror of the web UI's config/navigation.js). */
object Routes {
    const val CHANNELS = "channels"
    const val VODS = "vods"
    const val SOURCES = "sources"
    const val GUIDE = "guide"
    const val DVR = "dvr"
    const val STATS = "stats"
    const val PLUGINS = "plugins"
    const val PLUGINS_BROWSE = "plugins_browse"
    const val USERS = "users"
    const val LOGOS = "logos"
    const val CONNECT = "connect"
    const val LOGS = "logs"
    const val SETTINGS = "settings"
    const val ACCOUNT = "account"
    const val ABOUT = "about"
    const val PLAYER = "player"
}

data class NavEntry(val route: String, val label: String, val icon: ImageVector)

/** A drawer item: either a single entry or a labelled group with children (web: `paths`). */
data class NavItem(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val adminOnly: Boolean,
    val route: String? = null,
    val children: List<NavEntry> = emptyList(),
)

val NAV_ITEMS: Map<String, NavItem> = linkedMapOf(
    "channels" to NavItem("channels", "Channels", Icons.AutoMirrored.Filled.ListAlt, false, Routes.CHANNELS),
    "vods" to NavItem("vods", "VODs", Icons.Default.Videocam, true, Routes.VODS),
    "sources" to NavItem("sources", "M3U & EPG Manager", Icons.Default.PlayCircle, true, Routes.SOURCES),
    "guide" to NavItem("guide", "TV Guide", Icons.Default.GridView, false, Routes.GUIDE),
    "dvr" to NavItem("dvr", "DVR", Icons.Default.Storage, true, Routes.DVR),
    "stats" to NavItem("stats", "Stats", Icons.AutoMirrored.Filled.ShowChart, true, Routes.STATS),
    "plugins" to NavItem(
        "plugins", "Plugins", Icons.Default.Extension, true, children = listOf(
            NavEntry(Routes.PLUGINS, "My Plugins", Icons.Default.Inventory2),
            NavEntry(Routes.PLUGINS_BROWSE, "Find Plugins", Icons.Default.Download),
        )
    ),
    "system" to NavItem(
        "system", "System", Icons.Default.Computer, true, children = listOf(
            NavEntry(Routes.USERS, "Users", Icons.Default.Person),
            NavEntry(Routes.LOGOS, "Logo Manager", Icons.Default.Image),
            NavEntry(Routes.CONNECT, "Connect", Icons.Default.Webhook),
            NavEntry(Routes.LOGS, "Logs", Icons.Default.Subject),
            NavEntry(Routes.SETTINGS, "Settings", Icons.Default.Settings),
        )
    ),
    "settings" to NavItem("settings", "Settings", Icons.Default.Settings, false, Routes.SETTINGS),
)

val DEFAULT_ADMIN_ORDER = listOf("channels", "vods", "sources", "guide", "dvr", "stats", "plugins", "system")
val DEFAULT_USER_ORDER = listOf("channels", "guide", "settings")

/**
 * Port of `getOrderedNavItems`: respects user's saved navOrder + hiddenNav
 * (stored in user.custom_properties) and standard-user DVR/VOD permissions.
 */
fun orderedNavItems(isAdmin: Boolean, savedOrder: List<String>, hidden: List<String>, canViewVod: Boolean, canViewDvr: Boolean): List<NavItem> {
    var def = if (isAdmin) DEFAULT_ADMIN_ORDER else DEFAULT_USER_ORDER
    if (!isAdmin && canViewVod) def = def.toMutableList().apply { add(indexOf("channels") + 1, "vods") }
    if (!isAdmin && canViewDvr) def = def.toMutableList().apply { add(indexOf("guide") + 1, "dvr") }
    val order = if (savedOrder.isNotEmpty()) {
        val filtered = savedOrder.filter { it in def }
        filtered + def.filter { it !in filtered }
    } else def
    return order.filter { it !in hidden || it == "system" || it == "settings" }.mapNotNull { NAV_ITEMS[it] }
}

/** App-wide navigation helper. Obtain with `LocalNavigator.current`. */
class AppNavigator(val nav: NavHostController) {
    /** Switch top-level section (clears back stack to it). */
    fun go(route: String) {
        nav.navigate(route) {
            popUpTo(nav.graph.startDestinationId) { saveState = false }
            launchSingleTop = true
        }
    }

    fun push(route: String) = nav.navigate(route)
    fun back() { nav.popBackStack() }

    /**
     * Opens the full-screen video player.
     * @param url absolute or server-relative URL (e.g. `/proxy/ts/stream/<uuid>`)
     * @param live true for live TS streams, false for VOD/recordings (seekable)
     */
    fun play(url: String, title: String, live: Boolean = true) {
        nav.navigate("${Routes.PLAYER}?url=${Uri.encode(url)}&title=${Uri.encode(title)}&live=$live")
    }
}

val LocalNavigator = compositionLocalOf<AppNavigator> { error("Navigator not provided") }

/** Opens the navigation drawer. */
val LocalDrawerOpener = compositionLocalOf<() -> Unit> { {} }
