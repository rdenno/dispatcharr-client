package com.rdenno.dispatcharr.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.rdenno.dispatcharr.App
import com.rdenno.dispatcharr.R
import com.rdenno.dispatcharr.data.ApiException
import com.rdenno.dispatcharr.data.Session
import com.rdenno.dispatcharr.data.asObj
import com.rdenno.dispatcharr.data.bool
import com.rdenno.dispatcharr.data.str
import com.rdenno.dispatcharr.ui.common.CheckboxRow
import com.rdenno.dispatcharr.ui.common.PasswordInput
import com.rdenno.dispatcharr.ui.common.TextInput
import com.rdenno.dispatcharr.ui.common.errorText
import com.rdenno.dispatcharr.ui.theme.DColors
import kotlinx.coroutines.launch

/**
 * Login screen: server URL + username/password. Also handles first-run superuser creation
 * (web: SuperuserForm) when the server reports `superuser_exists == false`.
 */
@Composable
fun LoginScreen() {
    val session = App.session
    val prefs = App.prefs
    val scope = rememberCoroutineScope()
    var server by remember { mutableStateOf(prefs.serverUrl.ifBlank { "http://" }) }
    var username by remember { mutableStateOf(prefs.lastUsername) }
    var password by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var remember by remember { mutableStateOf(prefs.getBool("remember_username", true)) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var info by remember { mutableStateOf<String?>(null) }
    var superuserMode by remember { mutableStateOf(false) }
    var setupBlockedIp by remember { mutableStateOf<String?>(null) }

    fun checkServer() {
        scope.launch {
            busy = true; error = null; info = null
            try {
                prefs.serverUrl = Session.normalizeServer(server)
                server = prefs.serverUrl
                val status = App.api.request("GET", "/api/accounts/initialize-superuser/", null, auth = false).asObj()
                superuserMode = status.bool("superuser_exists") == false
                if (superuserMode && status.bool("setup_allowed") == false) setupBlockedIp = status.str("client_ip") ?: "?"
                val v = runCatching { App.api.request("GET", "/api/core/version/", null, auth = false).asObj() }.getOrNull()
                info = "Connected" + (v.str("version")?.let { " – Dispatcharr v$it" } ?: "")
                // Try reverse proxy auth silently
                if (!superuserMode && App.api.proxyLogin()) session.bootstrap()
            } catch (t: Throwable) {
                error = errorText(t)
            } finally { busy = false }
        }
    }

    fun submit() {
        scope.launch {
            busy = true; error = null
            try {
                prefs.putBool("remember_username", remember)
                if (superuserMode) {
                    prefs.serverUrl = Session.normalizeServer(server)
                    App.api.request(
                        "POST", "/api/accounts/initialize-superuser/",
                        mapOf("username" to username, "password" to password, "email" to email), auth = false,
                    )
                    superuserMode = false
                }
                session.login(server, username, password)
                if (!remember) prefs.lastUsername = ""
            } catch (e: ApiException) {
                error = if (e.status == 401) "Invalid username or password" else e.friendly
                if (e.status == 403 && e.body.asObj().bool("setup_allowed") == false) setupBlockedIp = e.body.asObj().str("client_ip")
            } catch (t: Throwable) {
                error = errorText(t)
            } finally { busy = false }
        }
    }

    Column(
        Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Spacer(Modifier.height(32.dp))
        Image(painterResource(R.drawable.logo), null, Modifier.size(96.dp))
        Spacer(Modifier.height(12.dp))
        Text("Dispatcharr", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
        Spacer(Modifier.height(24.dp))
        Card(
            modifier = Modifier.widthIn(max = 480.dp).fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = DColors.Surface),
        ) {
            Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(if (superuserMode) "Create Super User" else "Login", style = MaterialTheme.typography.titleLarge)
                if (superuserMode) Text(
                    "Welcome! Create your super user account to get started.",
                    color = DColors.TextMuted, style = MaterialTheme.typography.bodyMedium,
                )
                TextInput(
                    "Server URL", server, { server = it },
                    placeholder = "http://192.168.1.10:9191",
                    description = "Address of your Dispatcharr instance",
                    keyboardType = KeyboardType.Uri,
                )
                TextButton(onClick = { checkServer() }, enabled = !busy) { Text("Test connection") }
                TextInput("Username", username, { username = it })
                PasswordInput("Password", password, { password = it })
                if (superuserMode) TextInput("Email (optional)", email, { email = it }, keyboardType = KeyboardType.Email)
                if (!superuserMode) CheckboxRow("Remember username", remember, { remember = it })
                setupBlockedIp?.let {
                    Text(
                        "Initial setup is not allowed from this device's IP ($it). Set DISPATCHARR_SETUP_ALLOWED_IP=$it on the server, or complete setup from an allowed network.",
                        color = DColors.Orange, style = MaterialTheme.typography.bodySmall,
                    )
                }
                info?.let { Text(it, color = DColors.SuccessIcon, style = MaterialTheme.typography.bodySmall) }
                error?.let { Text(it, color = DColors.Red, style = MaterialTheme.typography.bodyMedium) }
                Button(
                    onClick = { submit() },
                    enabled = !busy && username.isNotBlank() && password.isNotBlank() && server.length > 7,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (busy) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                    else Text(if (superuserMode) "Create Account" else "Login")
                }
            }
        }
    }
}
