package com.rdenno.dispatcharr.ui.connect

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
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
fun ConnectScreen() {
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val integrationsLoadable = rememberLoadable {
        App.api.get("/api/connect/integrations/").resultsList()
    }

    var createDialogOpen by remember { mutableStateOf(false) }
    var editingIntegration by remember { mutableStateOf<JsonObject?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "Connect & Webhooks",
                subtitle = "External Integrations (Discord, Webhooks, Emby)"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Integrations (${integrationsLoadable.data?.size ?: 0})", style = MaterialTheme.typography.titleMedium)
                Button(onClick = { createDialogOpen = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Add Integration")
                }
            }

            RefreshableBox(
                refreshing = integrationsLoadable.refreshing,
                onRefresh = { integrationsLoadable.reload() }
            ) {
                LoadableContent(integrationsLoadable) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No Connect integrations configured")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.int("id") ?: it.toString() }) { item ->
                                val name = item.str("name") ?: "Integration"
                                val type = item.str("integration_type") ?: "webhook"
                                val enabled = item.bool("enabled") ?: true
                                val id = item.int("id")

                                ItemCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Badge(type.uppercase(), color = DColors.Teal)
                                                if (!enabled) Badge("DISABLED", color = DColors.Red)
                                            }
                                            item.str("url")?.let {
                                                Spacer(Modifier.height(4.dp))
                                                Text(it, style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                            }
                                        }

                                        OverflowMenu(
                                            actions = listOf(
                                                MenuAction("Edit Integration", Icons.Default.Edit, onClick = { editingIntegration = item }),
                                                MenuAction("Delete Integration", Icons.Default.Delete, destructive = true, onClick = {
                                                    confirm.ask("Delete Integration", "Delete integration '$name'?") {
                                                        action.run("Integration deleted") {
                                                            App.api.delete("/api/connect/integrations/$id/")
                                                            integrationsLoadable.reload()
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

    if (createDialogOpen) {
        IntegrationEditDialog(
            integration = null,
            onDismiss = { createDialogOpen = false },
            onSaved = {
                createDialogOpen = false
                integrationsLoadable.reload()
            }
        )
    }

    editingIntegration?.let { item ->
        IntegrationEditDialog(
            integration = item,
            onDismiss = { editingIntegration = null },
            onSaved = {
                editingIntegration = null
                integrationsLoadable.reload()
            }
        )
    }
}

@Composable
fun IntegrationEditDialog(
    integration: JsonObject?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val isEdit = integration != null

    var name by remember { mutableStateOf(integration.str("name") ?: "") }
    var integrationType by remember { mutableStateOf(integration.str("integration_type") ?: "webhook") }
    var url by remember { mutableStateOf(integration.str("url") ?: "") }
    var enabled by remember { mutableStateOf(integration.bool("enabled") ?: true) }

    FullScreenDialog(
        title = if (isEdit) "Edit Integration" else "New Integration",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("Integration saved", onSuccess = onSaved) {
                        val payload = mutableMapOf<String, Any?>(
                            "name" to name,
                            "integration_type" to integrationType,
                            "url" to url,
                            "enabled" to enabled
                        )
                        if (isEdit) {
                            App.api.put("/api/connect/integrations/${integration.int("id")}/", payload)
                        } else {
                            App.api.post("/api/connect/integrations/", payload)
                        }
                    }
                },
                enabled = !action.busy && name.isNotBlank() && url.isNotBlank()
            ) {
                Text("Save", color = DColors.Teal)
            }
        }
    ) {
        TextInput("Integration Name", name, { name = it })
        SelectField(
            label = "Type",
            options = listOf(
                Option("webhook", "Generic Webhook"),
                Option("discord", "Discord Webhook"),
                Option("telegram", "Telegram Bot"),
                Option("slack", "Slack Incoming Webhook")
            ),
            selected = integrationType,
            onSelect = { if (it != null) integrationType = it }
        )
        TextInput("Webhook URL / Endpoint", url, { url = it })
        SwitchRow("Enabled", enabled, { enabled = it })
    }
}
