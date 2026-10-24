package com.rdenno.dispatcharr.ui.plugins

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PluginsScreen() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val pluginsLoadable = rememberLoadable {
        App.api.get("/api/plugins/plugins/").resultsList()
    }

    var selectedPluginSettings by remember { mutableStateOf<JsonObject?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "My Plugins",
                subtitle = "Installed Dispatcharr Plugins"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Installed Plugins (${pluginsLoadable.data?.size ?: 0})", style = MaterialTheme.typography.titleMedium)
                Button(
                    onClick = {
                        action.run("Plugins reloaded") {
                            App.api.post("/api/plugins/plugins/reload/")
                            pluginsLoadable.reload()
                        }
                    }
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Reload")
                }
            }

            RefreshableBox(
                refreshing = pluginsLoadable.refreshing,
                onRefresh = { pluginsLoadable.reload() }
            ) {
                LoadableContent(pluginsLoadable) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No plugins installed")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.str("key") ?: it.str("id") ?: it.toString() }) { p ->
                                val name = p.str("name") ?: p.str("title") ?: "Plugin"
                                val version = p.str("version") ?: "1.0"
                                val enabled = p.bool("enabled") ?: true
                                val key = p.str("key") ?: ""

                                ItemCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Badge("v$version", color = DColors.Teal)
                                            }
                                            p.str("description")?.let {
                                                Spacer(Modifier.height(4.dp))
                                                Text(it, style = MaterialTheme.typography.bodySmall, color = DColors.TextSecondary)
                                            }
                                        }

                                        Switch(
                                            checked = enabled,
                                            onCheckedChange = { isChecked ->
                                                action.run {
                                                    App.api.post("/api/plugins/plugins/$key/enabled/", mapOf("enabled" to isChecked))
                                                    pluginsLoadable.reload()
                                                }
                                            }
                                        )

                                        OverflowMenu(
                                            actions = listOf(
                                                MenuAction("Settings", Icons.Default.Settings, onClick = { selectedPluginSettings = p }),
                                                MenuAction("Uninstall", Icons.Default.Delete, destructive = true, onClick = {
                                                    confirm.ask("Uninstall Plugin", "Uninstall $name?") {
                                                        action.run("Plugin removed") {
                                                            App.api.delete("/api/plugins/plugins/$key/delete/")
                                                            pluginsLoadable.reload()
                                                        }
                                                    }
                                                })
                                            )
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    selectedPluginSettings?.let { p ->
        PluginSettingsDialog(
            plugin = p,
            onDismiss = { selectedPluginSettings = null },
            onSaved = {
                selectedPluginSettings = null
                pluginsLoadable.reload()
            }
        )
    }
}

@Composable
fun PluginSettingsDialog(
    plugin: JsonObject,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val name = plugin.str("name") ?: "Plugin"
    val key = plugin.str("key") ?: ""

    FullScreenDialog(
        title = "$name Settings",
        onDismiss = onDismiss
    ) {
        Text("Plugin settings for $name are managed dynamically according to its schema.", color = DColors.TextSecondary)
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                action.run("Plugin action executed") {
                    App.api.post("/api/plugins/plugins/$key/run/")
                }
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Run Plugin Action")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PluginBrowseScreen() {
    val action = rememberAction()
    val availablePlugins = rememberLoadable {
        App.api.get("/api/plugins/repos/available/").resultsList()
    }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Find Plugins",
                subtitle = "Plugin Repository Directory"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            RefreshableBox(
                refreshing = availablePlugins.refreshing,
                onRefresh = { availablePlugins.reload() }
            ) {
                LoadableContent(availablePlugins) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No plugins available in registered repositories")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.str("manifest_url") ?: it.str("key") ?: it.toString() }) { p ->
                                val name = p.str("name") ?: "Plugin"
                                val author = p.str("author") ?: "Community"
                                val desc = p.str("description")

                                ItemCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Text("By $author", style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                                            if (!desc.isNullOrBlank()) {
                                                Spacer(Modifier.height(4.dp))
                                                Text(desc, style = MaterialTheme.typography.bodySmall, color = DColors.TextSecondary)
                                            }
                                        }

                                        Button(
                                            onClick = {
                                                action.run("Installing $name") {
                                                    App.api.post(
                                                        "/api/plugins/repos/install/",
                                                        mapOf(
                                                            "repo_id" to p.int("repo_id"),
                                                            "manifest_url" to p.str("manifest_url")
                                                        )
                                                    )
                                                }
                                            }
                                        ) {
                                            Text("Install")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
