package com.rdenno.dispatcharr.ui.users

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Key
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
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
fun UsersScreen() {
    val context = LocalContext.current
    val messenger = LocalMessenger.current
    val action = rememberAction()
    val confirm = rememberConfirm()
    ConfirmHost(confirm)

    val usersLoadable = rememberLoadable {
        App.api.get("/api/accounts/users/").resultsList()
    }

    var createUserDialogOpen by remember { mutableStateOf(false) }
    var editingUser by remember { mutableStateOf<JsonObject?>(null) }
    var apiKeyResult by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            AppTopBar(
                title = "User Management",
                subtitle = "Manage Accounts, Roles & API Keys"
            )
        }
    ) { pad ->
        Column(modifier = Modifier.padding(pad).fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("Users (${usersLoadable.data?.size ?: 0})", style = MaterialTheme.typography.titleMedium)
                Button(onClick = { createUserDialogOpen = true }) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(Modifier.width(4.dp))
                    Text("Add User")
                }
            }

            RefreshableBox(
                refreshing = usersLoadable.refreshing,
                onRefresh = { usersLoadable.reload() }
            ) {
                LoadableContent(usersLoadable) { list ->
                    if (list.isEmpty()) {
                        EmptyBox("No users found")
                    } else {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = ListPadding,
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            items(list, key = { it.int("id") ?: it.toString() }) { u ->
                                val username = u.str("username") ?: "User"
                                val level = u.int("user_level") ?: 1
                                val email = u.str("email")
                                val uid = u.int("id")

                                ItemCard {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                                Text(username, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                                Badge(
                                                    UserLevel.label(level),
                                                    color = if (level >= UserLevel.ADMIN) DColors.Red else DColors.Teal
                                                )
                                            }
                                            if (!email.isNullOrBlank()) {
                                                Spacer(Modifier.height(4.dp))
                                                Text(email, style = MaterialTheme.typography.bodySmall, color = DColors.TextMuted)
                                            }
                                        }

                                        OverflowMenu(
                                            actions = listOf(
                                                MenuAction("Edit User", Icons.Default.Edit, onClick = { editingUser = u }),
                                                MenuAction(
                                                    label = "Generate API Key",
                                                    icon = Icons.Default.Key,
                                                    onClick = {
                                                        action.run {
                                                            val res = App.api.post("/api/accounts/api-keys/generate/", mapOf("user_id" to uid)).asObj()
                                                            apiKeyResult = res.str("api_key") ?: res.str("key")
                                                        }
                                                    }
                                                ),
                                                MenuAction(
                                                    label = "Delete User",
                                                    icon = Icons.Default.Delete,
                                                    destructive = true,
                                                    onClick = {
                                                        confirm.ask("Delete User", "Delete user '$username'?") {
                                                            action.run("User deleted") {
                                                                App.api.delete("/api/accounts/users/$uid/")
                                                                usersLoadable.reload()
                                                            }
                                                        }
                                                    }
                                                )
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

    if (createUserDialogOpen) {
        UserEditDialog(
            user = null,
            onDismiss = { createUserDialogOpen = false },
            onSaved = {
                createUserDialogOpen = false
                usersLoadable.reload()
            }
        )
    }

    editingUser?.let { u ->
        UserEditDialog(
            user = u,
            onDismiss = { editingUser = null },
            onSaved = {
                editingUser = null
                usersLoadable.reload()
            }
        )
    }

    apiKeyResult?.let { key ->
        AlertDialog(
            onDismissRequest = { apiKeyResult = null },
            title = { Text("Generated API Key") },
            text = {
                Column {
                    Text("Copy this key now. It won't be shown again:")
                    Spacer(Modifier.height(8.dp))
                    Text(key, fontWeight = FontWeight.Bold, color = DColors.Teal)
                }
            },
            confirmButton = {
                Button(onClick = {
                    copyToClipboard(context, key, messenger)
                    apiKeyResult = null
                }) {
                    Text("Copy & Close")
                }
            }
        )
    }
}

@Composable
fun UserEditDialog(
    user: JsonObject?,
    onDismiss: () -> Unit,
    onSaved: () -> Unit
) {
    val action = rememberAction()
    val isEdit = user != null

    var username by remember { mutableStateOf(user.str("username") ?: "") }
    var password by remember { mutableStateOf("") }
    var email by remember { mutableStateOf(user.str("email") ?: "") }
    var userLevel by remember { mutableIntStateOf(user.int("user_level") ?: UserLevel.STANDARD) }

    FullScreenDialog(
        title = if (isEdit) "Edit User" else "New User",
        onDismiss = onDismiss,
        actions = {
            TextButton(
                onClick = {
                    action.run("User saved", onSuccess = onSaved) {
                        val payload = mutableMapOf<String, Any?>(
                            "username" to username,
                            "email" to email,
                            "user_level" to userLevel
                        )
                        if (password.isNotBlank()) payload["password"] = password

                        if (isEdit) {
                            App.api.patch("/api/accounts/users/${user.int("id")}/", payload)
                        } else {
                            App.api.post("/api/accounts/users/", payload)
                        }
                    }
                },
                enabled = !action.busy && username.isNotBlank() && (isEdit || password.isNotBlank())
            ) {
                Text("Save", color = DColors.Teal)
            }
        }
    ) {
        TextInput("Username", username, { username = it })
        PasswordInput(if (isEdit) "New Password (leave blank to keep)" else "Password", password, { password = it })
        TextInput("Email", email, { email = it })

        SelectField(
            label = "User Level / Role",
            options = listOf(
                Option(UserLevel.STREAMER, "Streamer (Playback Only)"),
                Option(UserLevel.STANDARD, "Standard User"),
                Option(UserLevel.ADMIN, "Administrator")
            ),
            selected = userLevel,
            onSelect = { if (it != null) userLevel = it }
        )
    }
}
