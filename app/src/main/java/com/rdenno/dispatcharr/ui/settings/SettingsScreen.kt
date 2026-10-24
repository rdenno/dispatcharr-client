package com.rdenno.dispatcharr.ui.settings

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.data.*
import com.rdenno.dispatcharr.ui.common.*
import com.rdenno.dispatcharr.ui.nav.AppTopBar
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.serialization.json.JsonObject

data class SettingsSection(val id: String, val label: String, val icon: ImageVector)
data class SettingsGroup(val label: String, val adminOnly: Boolean, val sections: List<SettingsSection>)

val SETTINGS_SCHEMA = listOf(
    SettingsGroup(
        label = "Streaming & Proxy",
        adminOnly = true,
        sections = listOf(
            SettingsSection("stream-settings", "Stream Settings", Icons.Default.Videocam),
            SettingsSection("proxy-settings", "Proxy Settings", Icons.Default.CompareArrows),
            SettingsSection("stream-profiles", "Stream Profiles", Icons.Default.Tune),
            SettingsSection("output-profiles", "Output Profiles", Icons.Default.Output)
        )
    ),
    SettingsGroup(
        label = "DVR & EPG",
        adminOnly = true,
        sections = listOf(
            SettingsSection("dvr-settings", "DVR Settings", Icons.Default.Tv),
            SettingsSection("epg-settings", "EPG Settings", Icons.Default.CalendarMonth)
        )
    ),
    SettingsGroup(
        label = "Network & Agents",
        adminOnly = true,
        sections = listOf(
            SettingsSection("user-agents", "User-Agents", Icons.Default.Computer),
            SettingsSection("network-access", "Network Access", Icons.Default.NetworkCheck)
        )
    ),
    SettingsGroup(
        label = "System & Maintenance",
        adminOnly = true,
        sections = listOf(
            SettingsSection("system-settings", "System Settings", Icons.Default.Settings),
            SettingsSection("reverse-proxy-auth", "Reverse Proxy Auth", Icons.Default.VpnKey),
            SettingsSection("backups", "Backup & Restore", Icons.Default.Backup)
        )
    )
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen() {
    val session = App.session
    val isAdmin = session.isAdmin
    var activeSection by remember { mutableStateOf<SettingsSection?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Settings",
                subtitle = "Server Configuration & Profiles"
            )
        }
    ) { pad ->
        LazyColumn(
            modifier = Modifier.padding(pad).fillMaxSize(),
            contentPadding = ListPadding,
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            val visibleGroups = SETTINGS_SCHEMA.filter { !it.adminOnly || isAdmin }
            items(visibleGroups) { group ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        group.label,
                        style = MaterialTheme.typography.titleMedium,
                        color = DColors.Teal,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                    group.sections.forEach { sec ->
                        ItemCard(onClick = { activeSection = sec }) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(sec.icon, contentDescription = null, tint = DColors.TextSecondary)
                                    Text(sec.label, style = MaterialTheme.typography.bodyLarge)
                                }
                                Icon(Icons.AutoMirrored.Filled.ArrowForward, contentDescription = null, tint = DColors.TextMuted)
                            }
                        }
                    }
                }
            }
        }
    }

    activeSection?.let { sec ->
        GenericSettingsFormDialog(
            section = sec,
            onDismiss = { activeSection = null }
        )
    }
}

@Composable
fun GenericSettingsFormDialog(
    section: SettingsSection,
    onDismiss: () -> Unit
) {
    val session = App.session
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val currentSettings by session.settings.collectAsState()

    when (section.id) {
        "stream-profiles" -> {
            StreamProfilesManager(onDismiss = onDismiss)
        }
        "output-profiles" -> {
            OutputProfilesManager(onDismiss = onDismiss)
        }
        "user-agents" -> {
            UserAgentsManager(onDismiss = onDismiss)
        }
        "backups" -> {
            BackupsManager(onDismiss = onDismiss)
        }
        else -> {
            // General Key/Value Settings category
            FullScreenDialog(
                title = section.label,
                onDismiss = onDismiss
            ) {
                Text(
                    "Configure ${section.label} parameters below.",
                    color = DColors.TextMuted,
                    style = MaterialTheme.typography.bodySmall
                )
                Spacer(Modifier.height(8.dp))

                // Filter settings related to this category prefix
                val prefix = when (section.id) {
                    "stream-settings" -> "stream"
                    "proxy-settings" -> "proxy"
                    "dvr-settings" -> "dvr"
                    "epg-settings" -> "epg"
                    "network-access" -> "network"
                    "reverse-proxy-auth" -> "reverse_proxy"
                    else -> "system"
                }

                val relevantSettings = currentSettings.values.filter {
                    val k = it.str("key") ?: ""
                    k.contains(prefix, ignoreCase = true)
                }

                if (relevantSettings.isEmpty()) {
                    Text("No specific settings found under '$prefix'. Fetching complete settings dictionary...")
                } else {
                    relevantSettings.forEach { s ->
                        val k = s.str("key") ?: ""
                        val name = s.str("name") ?: k
                        val v = s["value"]

                        var editValue by remember(v) { mutableStateOf(v.asStr() ?: v?.toString() ?: "") }

                        Row(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            TextInput(
                                label = name,
                                value = editValue,
                                onValueChange = { editValue = it },
                                modifier = Modifier.weight(1f)
                            )
                            Button(
                                onClick = {
                                    action.run("Setting saved") {
                                        session.saveSetting(k, editValue, name)
                                    }
                                }
                            ) {
                                Text("Save")
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StreamProfilesManager(onDismiss: () -> Unit) {
    val session = App.session
    val profiles by session.streamProfiles.collectAsState()
    val action = rememberAction()
    var editingProfile by remember { mutableStateOf<JsonObject?>(null) }
    var createOpen by remember { mutableStateOf(false) }

    FullScreenDialog(
        title = "Stream Profiles",
        onDismiss = onDismiss,
        actions = {
            IconButton(onClick = { createOpen = true }) {
                Icon(Icons.Default.Add, contentDescription = "Add", tint = DColors.Teal)
            }
        }
    ) {
        profiles.forEach { p ->
            val name = p.str("name") ?: "Profile"
            ItemCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Clients buffer: ${p.int("buffer_size") ?: 0}KB", style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                    }
                    IconButton(
                        onClick = {
                            action.run("Profile deleted") {
                                App.api.delete("/api/core/streamprofiles/${p.int("id")}/")
                                session.refreshStreamProfiles()
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

@Composable
fun OutputProfilesManager(onDismiss: () -> Unit) {
    val session = App.session
    val profiles by session.outputProfiles.collectAsState()
    val action = rememberAction()

    FullScreenDialog(title = "Output Profiles", onDismiss = onDismiss) {
        profiles.forEach { p ->
            val name = p.str("name") ?: "Output Profile"
            ItemCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    IconButton(
                        onClick = {
                            action.run("Profile deleted") {
                                App.api.delete("/api/core/outputprofiles/${p.int("id")}/")
                                session.refreshOutputProfiles()
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

@Composable
fun UserAgentsManager(onDismiss: () -> Unit) {
    val session = App.session
    val agents by session.userAgents.collectAsState()
    val action = rememberAction()
    var newAgentString by remember { mutableStateOf("") }

    FullScreenDialog(title = "User-Agents", onDismiss = onDismiss) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            TextInput("New User-Agent Header", newAgentString, { newAgentString = it }, modifier = Modifier.weight(1f))
            Button(
                onClick = {
                    action.run("User-Agent added") {
                        App.api.post("/api/core/useragents/", mapOf("user_agent" to newAgentString))
                        newAgentString = ""
                        session.refreshUserAgents()
                    }
                },
                enabled = newAgentString.isNotBlank() && !action.busy
            ) {
                Text("Add")
            }
        }
        Spacer(Modifier.height(8.dp))
        agents.forEach { a ->
            ItemCard {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(a.str("user_agent") ?: "", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                    IconButton(
                        onClick = {
                            action.run("Deleted") {
                                App.api.delete("/api/core/useragents/${a.int("id")}/")
                                session.refreshUserAgents()
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

@Composable
fun BackupsManager(onDismiss: () -> Unit) {
    val action = rememberAction()
    val backupsLoadable = rememberLoadable {
        App.api.get("/api/backups/").resultsList()
    }

    FullScreenDialog(
        title = "Backup & Restore",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("Backup initiated") {
                        App.api.post("/api/backups/create/")
                        backupsLoadable.reload()
                    }
                }
            ) {
                Text("Create Backup", color = DColors.Teal)
            }
        }
    ) {
        LoadableContent(backupsLoadable) { list ->
            if (list.isEmpty()) {
                EmptyBox("No backups created yet")
            } else {
                list.forEach { b ->
                    val filename = b.str("filename") ?: "backup.tar.gz"
                    val size = b.long("size")
                    val date = b.str("created_at")

                    ItemCard {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(filename, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    if (size != null) Text(Fmt.bytes(size), style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                    if (date != null) Text(Fmt.dateTime(date), style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                }
                            }
                            IconButton(
                                onClick = {
                                    action.run("Backup deleted") {
                                        App.api.delete("/api/backups/${java.net.URLEncoder.encode(filename, "UTF-8")}/delete/")
                                        backupsLoadable.reload()
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen() {
    val session = App.session
    val user by session.user.collectAsState()
    val action = rememberAction()

    var email by remember { mutableStateOf(user.str("email") ?: "") }
    var password by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "My Account",
                subtitle = "Profile & Security"
            )
        }
    ) { pad ->
        Column(
            modifier = Modifier.padding(pad).fillMaxSize().padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Username: ${user.str("username")}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Text("Role: ${UserLevel.label(user.int("user_level"))}", style = MaterialTheme.typography.bodyMedium, color = DColors.Teal)

            Spacer(Modifier.height(8.dp))
            TextInput("Email Address", email, { email = it })
            PasswordInput("New Password (optional)", password, { password = it })

            Button(
                onClick = {
                    action.run("Profile updated") {
                        val payload = mutableMapOf<String, Any?>("email" to email)
                        if (password.isNotBlank()) payload["password"] = password
                        session.updateMe(payload)
                        password = ""
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Update Account")
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AboutScreen() {
    val session = App.session
    val version by session.version.collectAsState()

    Scaffold(
        topBar = {
            AppTopBar(
                title = "About Dispatcharr",
                subtitle = "Client & Server Version Information"
            )
        }
    ) { pad ->
        Column(
            modifier = Modifier.padding(pad).fillMaxSize().padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Spacer(Modifier.height(32.dp))
            Icon(Icons.Default.Info, contentDescription = null, tint = DColors.Teal, modifier = Modifier.size(64.dp))
            Text("Dispatcharr Android", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Text("Native Mobile Client for Dispatcharr IPTV & DVR Manager", style = MaterialTheme.typography.bodyMedium, color = DColors.TextMuted)

            Spacer(Modifier.height(16.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = DColors.Surface)
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    InfoRow("Server URL", App.prefs.serverUrl)
                    InfoRow("Server Version", version.str("version") ?: "Unknown")
                    InfoRow("App Version", "1.0.0 (Release)")
                    InfoRow("Environment", session.envMode)
                }
            }
        }
    }
}
