package com.rdenno.dispatcharr.ui.channels

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.nav.LocalNavigator
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChannelsScreen() {
    val nav = LocalNavigator.current
    val session = App.session
    val isAdmin = session.isAdmin

    var tabIndex by remember { mutableIntStateOf(0) }
    val tabs = if (isAdmin) listOf("Channels", "Streams") else listOf("Channels")

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Channels & Streams",
                subtitle = if (tabIndex == 0) "Manage IPTV Channels" else "Manage Raw Streams"
            )
        }
    ) { pad ->
        Column(
            modifier = Modifier
                .padding(pad)
                .fillMaxSize()
        ) {
            if (isAdmin) {
                TabRow(
                    selectedTabIndex = tabIndex,
                    containerColor = DColors.Surface,
                    contentColor = Color.White
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = tabIndex == index,
                            onClick = { tabIndex = index },
                            text = { Text(title) }
                        )
                    }
                }
            }

            if (tabIndex == 0) {
                ChannelsTab()
            } else {
                StreamsTab()
            }
        }
    }
}

@Composable
fun ChannelsTab() {
    val nav = LocalNavigator.current
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    var searchQuery by remember { mutableStateOf("") }
    var selectedGroup by remember { mutableStateOf<Int?>(null) }
    var showDisabled by remember { mutableStateOf(false) }
    var showStreamless by remember { mutableStateOf(false) }

    val channelGroups by App.session.channelGroups.collectAsState()
    var editingChannel by remember { mutableStateOf<JsonObject?>(null) }
    var createDialogOpen by remember { mutableStateOf(false) }
    var assignNumbersDialogOpen by remember { mutableStateOf(false) }
    var groupManagerOpen by remember { mutableStateOf(false) }

    val channelsLoadable = rememberLoadable(searchQuery, selectedGroup, showDisabled, showStreamless) {
        val q = mutableMapOf<String, Any?>()
        if (searchQuery.isNotBlank()) q["search"] = searchQuery
        if (selectedGroup != null) q["channel_group"] = selectedGroup
        if (!showDisabled) q["enabled"] = true
        if (showStreamless) q["streamless"] = true
        App.api.get("/api/channels/channels/", q).resultsList()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        // Search & Filter controls
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SearchField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.weight(1f),
                placeholder = "Search channels..."
            )
            IconButton(onClick = { createDialogOpen = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add Channel", tint = DColors.Teal)
            }
            OverflowMenu(
                actions = listOf(
                    MenuAction(
                        label = if (showDisabled) "Hide Disabled" else "Show Disabled",
                        icon = Icons.Default.Visibility,
                        onClick = { showDisabled = !showDisabled }
                    ),
                    MenuAction(
                        label = if (showStreamless) "Show All Channels" else "Show Only Streamless",
                        icon = Icons.Default.FilterList,
                        onClick = { showStreamless = !showStreamless }
                    ),
                    MenuAction(
                        label = "Assign Channel Numbers",
                        icon = Icons.Default.FormatListNumbered,
                        onClick = { assignNumbersDialogOpen = true }
                    ),
                    MenuAction(
                        label = "Manage Channel Groups",
                        icon = Icons.Default.Category,
                        onClick = { groupManagerOpen = true }
                    ),
                    MenuAction(
                        label = "Auto Match EPG",
                        icon = Icons.Default.AutoFixHigh,
                        onClick = {
                            action.run("EPG matching started") {
                                App.api.post("/api/channels/channels/match-epg/")
                                channelsLoadable.reload()
                            }
                        }
                    )
                )
            )
        }

        // Group Filter Chips
        if (channelGroups.isNotEmpty()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterChip(
                    selected = selectedGroup == null,
                    onClick = { selectedGroup = null },
                    label = { Text("All Groups") }
                )
                channelGroups.take(5).forEach { group ->
                    val gid = group.int("id")
                    FilterChip(
                        selected = selectedGroup == gid,
                        onClick = { selectedGroup = if (selectedGroup == gid) null else gid },
                        label = { Text(group.str("name") ?: "") }
                    )
                }
            }
        }

        RefreshableBox(
            refreshing = channelsLoadable.refreshing,
            onRefresh = { channelsLoadable.reload() }
        ) {
            LoadableContent(channelsLoadable) { list ->
                if (list.isEmpty()) {
                    EmptyBox("No channels found")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = ListPadding,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(list, key = { it.int("id") ?: it.str("uuid") ?: it.toString() }) { ch ->
                            ChannelRowItem(
                                channel = ch,
                                onPlay = {
                                    val streamUrl = "/proxy/ts/stream/${ch.str("uuid")}"
                                    nav.play(streamUrl, ch.str("name") ?: "Channel", live = true)
                                },
                                onEdit = { editingChannel = ch },
                                onToggleEnabled = { enabled ->
                                    action.run {
                                        val id = ch.int("id")
                                        App.api.patch("/api/channels/channels/$id/", mapOf("enabled" to enabled))
                                        channelsLoadable.reload()
                                    }
                                },
                                onDelete = {
                                    confirm.ask(
                                        title = "Delete Channel",
                                        message = "Are you sure you want to delete ${ch.str("name")}?",
                                        destructive = true
                                    ) {
                                        action.run("Channel deleted") {
                                            App.api.delete("/api/channels/channels/${ch.int("id")}/")
                                            channelsLoadable.reload()
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
        ChannelEditDialog(
            channel = null,
            onDismiss = { createDialogOpen = false },
            onSaved = {
                createDialogOpen = false
                channelsLoadable.reload()
            }
        )
    }

    editingChannel?.let { ch ->
        ChannelEditDialog(
            channel = ch,
            onDismiss = { editingChannel = null },
            onSaved = {
                editingChannel = null
                channelsLoadable.reload()
            }
        )
    }

    if (assignNumbersDialogOpen) {
        AssignNumbersDialog(
            onDismiss = { assignNumbersDialogOpen = false },
            onAssigned = {
                assignNumbersDialogOpen = false
                channelsLoadable.reload()
            }
        )
    }

    if (groupManagerOpen) {
        GroupManagerDialog(onDismiss = { groupManagerOpen = false })
    }
}

@Composable
fun ChannelRowItem(
    channel: JsonObject,
    onPlay: () -> Unit,
    onEdit: () -> Unit,
    onToggleEnabled: (Boolean) -> Unit,
    onDelete: () -> Unit
) {
    val name = channel.str("name") ?: "Unnamed Channel"
    val chNum = channel.double("channel_number")?.let {
        if (it % 1.0 == 0.0) it.toInt().toString() else it.toString()
    } ?: "—"
    val enabled = channel.bool("enabled") ?: true
    val logoUrl = channel.str("logo_url") ?: channel.path("logo.url").asStr()
    val groupName = channel.path("channel_group.name").asStr() ?: channel.str("group_name")
    val streamCount = channel.arr("streams")?.size ?: channel.int("stream_count") ?: 0

    ItemCard(onClick = onPlay) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = chNum,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = DColors.Teal,
                modifier = Modifier.width(42.dp)
            )

            RemoteImage(
                url = logoUrl,
                modifier = Modifier.size(40.dp)
            )

            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (!enabled) {
                        Badge("DISABLED", color = DColors.Red)
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    if (!groupName.isNullOrBlank()) {
                        Text(groupName, style = MaterialTheme.typography.labelSmall, color = DColors.TextMuted)
                    }
                    Badge("$streamCount streams", color = if (streamCount > 0) DColors.Blue else DColors.Orange)
                }
            }

            IconButton(onClick = onPlay) {
                Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = DColors.Teal)
            }

            OverflowMenu(
                actions = listOf(
                    MenuAction("Edit Channel", Icons.Default.Edit, onClick = onEdit),
                    MenuAction(
                        if (enabled) "Disable" else "Enable",
                        if (enabled) Icons.Default.Block else Icons.Default.Check,
                        onClick = { onToggleEnabled(!enabled) }
                    ),
                    MenuAction("Delete Channel", Icons.Default.Delete, destructive = true, onClick = onDelete)
                )
            )
        }
    }
}

@Composable
fun ChannelEditDialog(
    channel: JsonObject?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val isEdit = channel != null

    var name by remember { mutableStateOf(channel.str("name") ?: "") }
    var channelNumber by remember { mutableStateOf(channel?.double("channel_number")?.toString() ?: "") }
    var selectedGroup by remember { mutableStateOf(channel?.path("channel_group.id").asInt() ?: channel.int("channel_group_id")) }
    var enabled by remember { mutableStateOf(channel.bool("enabled") ?: true) }
    var streamProfileId by remember { mutableStateOf(channel.int("stream_profile_id")) }

    val groups by App.session.channelGroups.collectAsState()
    val streamProfiles by App.session.streamProfiles.collectAsState()

    FullScreenDialog(
        title = if (isEdit) "Edit Channel" else "New Channel",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("Channel saved", onSuccess = onSaved) {
                        val payload = mutableMapOf<String, Any?>(
                            "name" to name,
                            "channel_number" to channelNumber.toDoubleOrNull(),
                            "channel_group_id" to selectedGroup,
                            "enabled" to enabled,
                            "stream_profile_id" to streamProfileId
                        )
                        if (isEdit) {
                            App.api.patch("/api/channels/channels/${channel.int("id")}/", payload)
                        } else {
                            App.api.post("/api/channels/channels/", payload)
                        }
                    }
                },
                enabled = !action.busy && name.isNotBlank()
            ) {
                Text("Save", color = DColors.Teal)
            }
        }
    ) {
        TextInput(label = "Channel Name", value = name, onValueChange = { name = it })
        TextInput(
            label = "Channel Number",
            value = channelNumber,
            onValueChange = { channelNumber = it },
            description = "e.g. 101 or 101.1"
        )

        SelectField(
            label = "Channel Group",
            options = groups.map { Option(it.int("id") ?: 0, it.str("name") ?: "") },
            selected = selectedGroup,
            onSelect = { selectedGroup = it },
            noneLabel = "None"
        )

        SelectField(
            label = "Stream Profile",
            options = streamProfiles.map { Option(it.int("id") ?: 0, it.str("name") ?: "") },
            selected = streamProfileId,
            onSelect = { streamProfileId = it },
            noneLabel = "Default Profile"
        )

        SwitchRow(
            label = "Enabled",
            checked = enabled,
            onCheckedChange = { enabled = it }
        )
    }
}

@Composable
fun AssignNumbersDialog(onDismiss: () -> Unit, onAssigned: () -> Unit) {
    val action = rememberAction()
    var startingNumber by remember { mutableStateOf("1") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Assign Channel Numbers") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Sequentially reassign channel numbers to all channels starting from:")
                TextInput(
                    label = "Starting Number",
                    value = startingNumber,
                    onValueChange = { startingNumber = it }
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    action.run("Channel numbers assigned", onSuccess = onAssigned) {
                        val num = startingNumber.toIntOrNull() ?: 1
                        App.api.post("/api/channels/channels/assign/", mapOf("starting_num" to num))
                    }
                }
            ) {
                Text("Assign")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancel") }
        }
    )
}

@Composable
fun GroupManagerDialog(onDismiss: () -> Unit) {
    val session = App.session
    val groups by session.channelGroups.collectAsState()
    val action = rememberAction()
    var newGroupName by remember { mutableStateOf("") }

    FullScreenDialog(
        title = "Manage Channel Groups",
        onDismiss = onDismiss
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextInput(
                label = "New Group Name",
                value = newGroupName,
                onValueChange = { newGroupName = it },
                modifier = Modifier.weight(1f)
            )
            Button(
                onClick = {
                    action.run("Group created") {
                        App.api.post("/api/channels/groups/", mapOf("name" to newGroupName))
                        newGroupName = ""
                        session.refreshChannelGroups()
                    }
                },
                enabled = newGroupName.isNotBlank() && !action.busy
            ) {
                Text("Add")
            }
        }

        Spacer(Modifier.height(12.dp))
        Text("Existing Groups (${groups.size}):", style = MaterialTheme.typography.titleMedium)

        LazyColumn(
            modifier = Modifier.fillMaxWidth().heightIn(max = 450.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            items(groups, key = { it.int("id") ?: 0 }) { g ->
                ItemCard {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(g.str("name") ?: "Unnamed", style = MaterialTheme.typography.bodyLarge)
                        IconButton(
                            onClick = {
                                action.run("Group deleted") {
                                    App.api.delete("/api/channels/groups/${g.int("id")}/")
                                    session.refreshChannelGroups()
                                }
                            }
                        ) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = DColors.Red)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StreamsTab() {
    val nav = LocalNavigator.current
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    var searchQuery by remember { mutableStateOf("") }
    var unassignedOnly by remember { mutableStateOf(false) }

    val streamsLoadable = rememberLoadable(searchQuery, unassignedOnly) {
        val q = mutableMapOf<String, Any?>()
        if (searchQuery.isNotBlank()) q["search"] = searchQuery
        if (unassignedOnly) q["unassigned"] = true
        App.api.get("/api/channels/streams/", q).resultsList()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            SearchField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                modifier = Modifier.weight(1f),
                placeholder = "Search raw streams..."
            )
            FilterChip(
                selected = unassignedOnly,
                onClick = { unassignedOnly = !unassignedOnly },
                label = { Text("Unassigned") }
            )
        }

        RefreshableBox(
            refreshing = streamsLoadable.refreshing,
            onRefresh = { streamsLoadable.reload() }
        ) {
            LoadableContent(streamsLoadable) { list ->
                if (list.isEmpty()) {
                    EmptyBox("No streams found")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = ListPadding,
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(list, key = { it.int("id") ?: it.str("url") ?: it.toString() }) { st ->
                            ItemCard(
                                onClick = {
                                    val streamHash = st.str("stream_hash") ?: st.str("uuid")
                                    val url = "/proxy/ts/stream/$streamHash"
                                    nav.play(url, st.str("name") ?: "Stream", live = true)
                                }
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = st.str("name") ?: "Unnamed Stream",
                                            style = MaterialTheme.typography.bodyLarge,
                                            fontWeight = FontWeight.SemiBold,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Text(
                                            text = st.str("url") ?: "",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = DColors.TextMuted,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.padding(top = 4.dp)) {
                                            st.str("channel_name")?.let {
                                                Badge("Assigned to: $it", color = DColors.Teal)
                                            } ?: Badge("Unassigned", color = DColors.Orange)
                                            st.str("m3u_account_name")?.let {
                                                Badge(it, color = DColors.Blue)
                                            }
                                        }
                                    }

                                    IconButton(
                                        onClick = {
                                            val streamHash = st.str("stream_hash") ?: st.str("uuid")
                                            val url = "/proxy/ts/stream/$streamHash"
                                            nav.play(url, st.str("name") ?: "Stream", live = true)
                                        }
                                    ) {
                                        Icon(Icons.Default.PlayArrow, contentDescription = "Play", tint = DColors.Teal)
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
