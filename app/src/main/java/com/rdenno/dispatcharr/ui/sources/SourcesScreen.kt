package com.rdenno.dispatcharr.ui.sources

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SourcesScreen() {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Playlists (M3U)", "EPG Sources")

    Scaffold(
        topBar = {
            AppTopBar(
                title = "M3U & EPG Manager",
                subtitle = if (selectedTab == 0) "M3U / Xtream Accounts" else "XMLTV & SD Sources"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            TabRow(
                selectedTabIndex = selectedTab,
                containerColor = DColors.Surface,
                contentColor = Color.White
            ) {
                tabs.forEachIndexed { idx, title ->
                    Tab(
                        selected = selectedTab == idx,
                        onClick = { selectedTab = idx },
                        text = { Text(title) }
                    )
                }
            }

            if (selectedTab == 0) {
                PlaylistsTab()
            } else {
                EpgSourcesTab()
            }
        }
    }
}

@Composable
fun PlaylistsTab() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val scope = rememberCoroutineScope()
    val playlists = rememberLoadable {
        App.api.get("/api/m3u/accounts/").resultsList()
    }

    var editingPlaylist by remember { mutableStateOf<JsonObject?>(null) }
    var createDialogOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Configured Playlists (${playlists.data?.size ?: 0})", style = MaterialTheme.typography.titleMedium)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { createDialogOpen = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Add Playlist")
                }
                IconButton(
                    onClick = {
                        action.run("All playlists refreshing") {
                            App.api.post("/api/m3u/refresh/")
                            playlists.reload()
                        }
                    }
                ) {
                    Icon(Icons.Default.Refresh, contentDescription = "Refresh All", tint = DColors.Teal)
                }
            }
        }

        RefreshableBox(
            refreshing = playlists.refreshing,
            onRefresh = { playlists.reload() }
        ) {
            LoadableContent(playlists) { list ->
                if (list.isEmpty()) {
                    EmptyBox("No playlists configured")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = ListPadding,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(list, key = { it.int("id") ?: it.toString() }) { pl ->
                            PlaylistItemCard(
                                playlist = pl,
                                onEdit = { editingPlaylist = pl },
                                onRefresh = {
                                    action.run("Refreshing ${pl.str("name")}") {
                                        App.api.post("/api/m3u/refresh/${pl.int("id")}/")
                                        playlists.reload()
                                    }
                                },
                                onRefreshVod = {
                                    action.run("Refreshing VOD for ${pl.str("name")}") {
                                        App.api.post("/api/m3u/accounts/${pl.int("id")}/refresh-vod/")
                                    }
                                },
                                onDelete = {
                                    confirm.ask(
                                        title = "Delete Playlist",
                                        message = "Delete ${pl.str("name")} and all its associated streams?",
                                        destructive = true
                                    ) {
                                        action.run("Playlist deleted") {
                                            App.api.delete("/api/m3u/accounts/${pl.int("id")}/")
                                            playlists.reload()
                                            scope.launch { App.session.refreshPlaylists() }
                                        }
                                    }
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    if (createDialogOpen) {
        PlaylistEditDialog(
            playlist = null,
            onDismiss = { createDialogOpen = false },
            onSaved = {
                createDialogOpen = false
                playlists.reload()
                scope.launch { App.session.refreshPlaylists() }
            }
        )
    }

    editingPlaylist?.let { pl ->
        PlaylistEditDialog(
            playlist = pl,
            onDismiss = { editingPlaylist = null },
            onSaved = {
                editingPlaylist = null
                playlists.reload()
                scope.launch { App.session.refreshPlaylists() }
            }
        )
    }
}

@Composable
fun PlaylistItemCard(
    playlist: JsonObject,
    onEdit: () -> Unit,
    onRefresh: () -> Unit,
    onRefreshVod: () -> Unit,
    onDelete: () -> Unit
) {
    val name = playlist.str("name") ?: "Unnamed Playlist"
    val type = playlist.str("account_type") ?: "STD"
    val enabled = playlist.bool("is_active") ?: playlist.bool("enabled") ?: true
    val streamsCount = playlist.int("total_streams") ?: playlist.int("streams_count") ?: 0
    val lastSync = playlist.str("last_refresh") ?: playlist.str("updated_at")

    ItemCard {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Badge(type, color = if (type == "XC") DColors.Orange else DColors.Blue)
                    if (!enabled) Badge("DISABLED", color = DColors.Red)
                }
                Spacer(Modifier.height(4.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text("$streamsCount streams", style = MaterialTheme.typography.bodySmall, color = DColors.TextSecondary)
                    if (!lastSync.isNullOrBlank()) {
                        Text("Synced: ${Fmt.relative(lastSync)}", style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                    }
                }
            }

            IconButton(onClick = onRefresh) {
                Icon(Icons.Default.Refresh, contentDescription = "Sync", tint = DColors.Teal)
            }

            OverflowMenu(
                actions = listOf(
                    MenuAction("Edit Settings", Icons.Default.Edit, onClick = onEdit),
                    MenuAction("Refresh Streams", Icons.Default.Refresh, onClick = onRefresh),
                    MenuAction("Refresh VOD Content", Icons.Default.VideoLibrary, onClick = onRefreshVod),
                    MenuAction("Delete Playlist", Icons.Default.Delete, destructive = true, onClick = onDelete)
                )
            )
        }
    }
}

@Composable
fun PlaylistEditDialog(
    playlist: JsonObject?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val isEdit = playlist != null

    var name by remember { mutableStateOf(playlist.str("name") ?: "") }
    var accountType by remember { mutableStateOf(playlist.str("account_type") ?: "STD") }
    var url by remember { mutableStateOf(playlist.str("url") ?: "") }
    var username by remember { mutableStateOf(playlist.str("username") ?: "") }
    var password by remember { mutableStateOf(playlist.str("password") ?: "") }
    var isActive by remember { mutableStateOf(playlist.bool("is_active") ?: true) }

    FullScreenDialog(
        title = if (isEdit) "Edit Playlist" else "Add Playlist",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("Playlist saved", onSuccess = onSaved) {
                        val payload = mutableMapOf<String, Any?>(
                            "name" to name,
                            "account_type" to accountType,
                            "url" to url,
                            "username" to username,
                            "password" to password,
                            "is_active" to isActive
                        )
                        if (isEdit) {
                            App.api.patch("/api/m3u/accounts/${playlist.int("id")}/", payload)
                        } else {
                            App.api.post("/api/m3u/accounts/", payload)
                        }
                    }
                },
                enabled = !action.busy && name.isNotBlank() && url.isNotBlank()
            ) {
                Text("Save", color = DColors.Teal)
            }
        }
    ) {
        TextInput("Playlist Name", name, { name = it })
        SelectField(
            label = "Account Type",
            options = listOf(
                Option("STD", "Standard M3U / URL"),
                Option("XC", "Xtream Codes API")
            ),
            selected = accountType,
            onSelect = { if (it != null) accountType = it }
        )

        TextInput("Server URL / M3U Link", url, { url = it }, placeholder = "http://provider.tv:8080")

        if (accountType == "XC") {
            TextInput("Username", username, { username = it })
            PasswordInput("Password", password, { password = it })
        }

        SwitchRow("Active", isActive, { isActive = it })
    }
}

@Composable
fun EpgSourcesTab() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val scope = rememberCoroutineScope()
    val epgSources = rememberLoadable {
        App.api.get("/api/epg/sources/").resultsList()
    }

    var editingSource by remember { mutableStateOf<JsonObject?>(null) }
    var createDialogOpen by remember { mutableStateOf(false) }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("EPG Sources (${epgSources.data?.size ?: 0})", style = MaterialTheme.typography.titleMedium)
            Button(onClick = { createDialogOpen = true }) {
                Icon(Icons.Default.Add, contentDescription = null)
                Spacer(Modifier.width(4.dp))
                Text("Add EPG Source")
            }
        }

        RefreshableBox(
            refreshing = epgSources.refreshing,
            onRefresh = { epgSources.reload() }
        ) {
            LoadableContent(epgSources) { list ->
                if (list.isEmpty()) {
                    EmptyBox("No EPG sources configured")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = ListPadding,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(list, key = { it.int("id") ?: it.toString() }) { src ->
                            val name = src.str("name") ?: "Unnamed Source"
                            val type = src.str("source_type") ?: "xmltv"
                            val channelsCount = src.int("channel_count") ?: 0
                            val programsCount = src.int("program_count") ?: 0

                            ItemCard {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                            Badge(type.uppercase(), color = DColors.Teal)
                                        }
                                        Spacer(Modifier.height(4.dp))
                                        Text("$channelsCount channels • $programsCount programs", style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                    }

                                    IconButton(
                                        onClick = {
                                            action.run("Importing EPG: $name") {
                                                App.api.post("/api/epg/import/", mapOf("id" to src.int("id"), "force" to true))
                                                epgSources.reload()
                                            }
                                        }
                                    ) {
                                        Icon(Icons.Default.Refresh, contentDescription = "Import", tint = DColors.Teal)
                                    }

                                    OverflowMenu(
                                        actions = listOf(
                                            MenuAction("Edit Source", Icons.Default.Edit, onClick = { editingSource = src }),
                                            MenuAction("Force Refresh", Icons.Default.Refresh, onClick = {
                                                action.run("Importing EPG: $name") {
                                                    App.api.post("/api/epg/import/", mapOf("id" to src.int("id"), "force" to true))
                                                    epgSources.reload()
                                                }
                                            }),
                                            MenuAction("Delete Source", Icons.Default.Delete, destructive = true, onClick = {
                                                confirm.ask(
                                                    title = "Delete EPG Source",
                                                    message = "Delete EPG source $name?",
                                                    destructive = true
                                                ) {
                                                    action.run("EPG deleted") {
                                                        App.api.delete("/api/epg/sources/${src.int("id")}/")
                                                        epgSources.reload()
                                                        scope.launch { App.session.refreshEpgSources() }
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

    if (createDialogOpen) {
        EpgEditDialog(
            source = null,
            onDismiss = { createDialogOpen = false },
            onSaved = {
                createDialogOpen = false
                epgSources.reload()
                scope.launch { App.session.refreshEpgSources() }
            }
        )
    }

    editingSource?.let { src ->
        EpgEditDialog(
            source = src,
            onDismiss = { editingSource = null },
            onSaved = {
                editingSource = null
                epgSources.reload()
                scope.launch { App.session.refreshEpgSources() }
            }
        )
    }
}

@Composable
fun EpgEditDialog(
    source: JsonObject?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val isEdit = source != null

    var name by remember { mutableStateOf(source.str("name") ?: "") }
    var sourceType by remember { mutableStateOf(source.str("source_type") ?: "xmltv") }
    var url by remember { mutableStateOf(source.str("url") ?: "") }

    FullScreenDialog(
        title = if (isEdit) "Edit EPG Source" else "New EPG Source",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("EPG saved", onSuccess = onSaved) {
                        val payload = mutableMapOf<String, Any?>(
                            "name" to name,
                            "source_type" to sourceType,
                            "url" to url
                        )
                        if (isEdit) {
                            App.api.patch("/api/epg/sources/${source.int("id")}/", payload)
                        } else {
                            App.api.post("/api/epg/sources/", payload)
                        }
                    }
                },
                enabled = !action.busy && name.isNotBlank() && (sourceType == "dummy" || url.isNotBlank())
            ) {
                Text("Save", color = DColors.Teal)
            }
        }
    ) {
        TextInput("Source Name", name, { name = it })
        SelectField(
            label = "Source Type",
            options = listOf(
                Option("xmltv", "XMLTV URL / File"),
                Option("schedules_direct", "Schedules Direct"),
                Option("dummy", "Dummy (Generated)")
            ),
            selected = sourceType,
            onSelect = { if (it != null) sourceType = it }
        )

        if (sourceType != "dummy") {
            TextInput("EPG XMLTV URL", url, { url = it }, placeholder = "http://provider.tv/epg.xml.gz")
        }
    }
}
