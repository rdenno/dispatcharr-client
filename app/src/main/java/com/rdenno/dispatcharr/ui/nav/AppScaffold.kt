package com.rdenno.dispatcharr.ui.nav

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.DrawerValue
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalDrawerSheet
import androidx.compose.material3.ModalNavigationDrawer
import androidx.compose.material3.NavigationDrawerItem
import androidx.compose.material3.NavigationDrawerItemDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.rememberDrawerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.R
import com.rdenno.dispatcharr.data.UserLevel
import com.rdenno.dispatcharr.data.int
import com.rdenno.dispatcharr.data.obj
import com.rdenno.dispatcharr.data.str
import com.rdenno.dispatcharr.data.strList
import com.rdenno.dispatcharr.ui.channels.ChannelsScreen
import com.rdenno.dispatcharr.ui.common.rememberAction
import com.rdenno.dispatcharr.ui.connect.ConnectScreen
import com.rdenno.dispatcharr.ui.dvr.DvrScreen
import com.rdenno.dispatcharr.ui.guide.GuideScreen
import com.rdenno.dispatcharr.ui.logos.LogosScreen
import com.rdenno.dispatcharr.ui.logs.LogsScreen
import com.rdenno.dispatcharr.ui.player.PlayerScreen
import com.rdenno.dispatcharr.ui.plugins.PluginBrowseScreen
import com.rdenno.dispatcharr.ui.plugins.PluginsScreen
import com.rdenno.dispatcharr.ui.settings.AboutScreen
import com.rdenno.dispatcharr.ui.settings.AccountScreen
import com.rdenno.dispatcharr.ui.settings.SettingsScreen
import com.rdenno.dispatcharr.ui.sources.SourcesScreen
import com.rdenno.dispatcharr.ui.stats.StatsScreen
import com.rdenno.dispatcharr.ui.theme.DColors
import com.rdenno.dispatcharr.ui.users.UsersScreen
import com.rdenno.dispatcharr.ui.vods.VodsScreen
import kotlinx.coroutines.launch

/** Logged-in shell: navigation drawer + NavHost with all top-level routes. */
@Composable
fun AppScaffold() {
    val nav = rememberNavController()
    val navigator = remember(nav) { AppNavigator(nav) }
    val drawerState = rememberDrawerState(DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    val backStack by nav.currentBackStackEntryAsState()
    val currentRoute = backStack?.destination?.route?.substringBefore("?")
    val inPlayer = currentRoute == Routes.PLAYER

    CompositionLocalProvider(
        LocalNavigator provides navigator,
        LocalDrawerOpener provides { scope.launch { drawerState.open() } },
    ) {
        ModalNavigationDrawer(
            drawerState = drawerState,
            gesturesEnabled = !inPlayer && drawerState.isOpen,
            drawerContent = {
                DrawerContent(currentRoute) { route ->
                    scope.launch { drawerState.close() }
                    navigator.go(route)
                }
            },
        ) {
            NavHost(nav, startDestination = Routes.CHANNELS, modifier = Modifier.fillMaxSize()) {
                composable(Routes.CHANNELS) { ChannelsScreen() }
                composable(Routes.VODS) { VodsScreen() }
                composable(Routes.SOURCES) { SourcesScreen() }
                composable(Routes.GUIDE) { GuideScreen() }
                composable(Routes.DVR) { DvrScreen() }
                composable(Routes.STATS) { StatsScreen() }
                composable(Routes.PLUGINS) { PluginsScreen() }
                composable(Routes.PLUGINS_BROWSE) { PluginBrowseScreen() }
                composable(Routes.USERS) { UsersScreen() }
                composable(Routes.LOGOS) { LogosScreen() }
                composable(Routes.CONNECT) { ConnectScreen() }
                composable(Routes.LOGS) { LogsScreen() }
                composable(Routes.SETTINGS) { SettingsScreen() }
                composable(Routes.ACCOUNT) { AccountScreen() }
                composable(Routes.ABOUT) { AboutScreen() }
                composable(
                    "${Routes.PLAYER}?url={url}&title={title}&live={live}",
                    arguments = listOf(
                        navArgument("url") { type = NavType.StringType; defaultValue = "" },
                        navArgument("title") { type = NavType.StringType; defaultValue = "" },
                        navArgument("live") { type = NavType.BoolType; defaultValue = true },
                    ),
                ) { entry ->
                    PlayerScreen(
                        url = entry.arguments?.getString("url").orEmpty(),
                        title = entry.arguments?.getString("title").orEmpty(),
                        live = entry.arguments?.getBoolean("live") ?: true,
                    )
                }
            }
        }
    }
}

@Composable
private fun DrawerContent(currentRoute: String?, onNavigate: (String) -> Unit) {
    val session = App.session
    val user by session.user.collectAsState()
    val action = rememberAction()
    val isAdmin = (user.int("user_level") ?: 0) >= UserLevel.ADMIN
    val custom = user.obj("custom_properties")
    val items = orderedNavItems(
        isAdmin = isAdmin,
        savedOrder = custom.strList("navOrder"),
        hidden = custom.strList("hiddenNav"),
        canViewVod = session.canViewVod,
        canViewDvr = session.canViewDvr,
    )
    val expanded = remember { mutableStateMapOf<String, Boolean>() }

    ModalDrawerSheet(drawerContainerColor = DColors.Background, modifier = Modifier.width(300.dp)) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState())) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.logo), null, Modifier.size(40.dp))
                Spacer(Modifier.width(12.dp))
                Column {
                    Text("Dispatcharr", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                    Text(App.prefs.serverUrl.removePrefix("http://").removePrefix("https://"), style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                }
            }
            HorizontalDivider(color = DColors.Border)
            Spacer(Modifier.height(8.dp))
            val colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = DColors.Teal.copy(alpha = 0.25f),
                unselectedContainerColor = DColors.Background,
            )
            items.forEach { item ->
                if (item.children.isEmpty()) {
                    NavigationDrawerItem(
                        label = { Text(item.label) },
                        icon = { Icon(item.icon, null) },
                        selected = currentRoute == item.route,
                        onClick = { item.route?.let(onNavigate) },
                        colors = colors,
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                } else {
                    val isOpen = expanded[item.id] ?: item.children.any { it.route == currentRoute }
                    NavigationDrawerItem(
                        label = { Text(item.label) },
                        icon = { Icon(item.icon, null) },
                        badge = { Icon(if (isOpen) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null) },
                        selected = false,
                        onClick = { expanded[item.id] = !isOpen },
                        colors = colors,
                        modifier = Modifier.padding(horizontal = 12.dp),
                    )
                    if (isOpen) item.children.forEach { child ->
                        NavigationDrawerItem(
                            label = { Text(child.label) },
                            icon = { Icon(child.icon, null) },
                            selected = currentRoute == child.route,
                            onClick = { onNavigate(child.route) },
                            colors = colors,
                            modifier = Modifier.padding(start = 32.dp, end = 12.dp),
                        )
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            HorizontalDivider(color = DColors.Border, modifier = Modifier.padding(top = 8.dp))
            Column(Modifier.padding(vertical = 8.dp), verticalArrangement = Arrangement.spacedBy(0.dp)) {
                NavigationDrawerItem(
                    label = {
                        Column {
                            Text(user.str("username") ?: "Account")
                            Text(UserLevel.label(user.int("user_level")), style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                        }
                    },
                    icon = { Icon(Icons.Default.AccountCircle, null) },
                    selected = currentRoute == Routes.ACCOUNT,
                    onClick = { onNavigate(Routes.ACCOUNT) },
                    colors = colors,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
                NavigationDrawerItem(
                    label = { Text("About") },
                    icon = { Icon(Icons.Default.Info, null) },
                    selected = currentRoute == Routes.ABOUT,
                    onClick = { onNavigate(Routes.ABOUT) },
                    colors = colors,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
                NavigationDrawerItem(
                    label = { Text("Log out") },
                    icon = { Icon(Icons.AutoMirrored.Filled.Logout, null) },
                    selected = false,
                    onClick = { action.run { session.logout() } },
                    colors = colors,
                    modifier = Modifier.padding(horizontal = 12.dp),
                )
                Text(
                    "v" + (session.version.collectAsState().value.str("version") ?: "?"),
                    style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 28.dp, vertical = 4.dp),
                )
            }
        }
    }
}
