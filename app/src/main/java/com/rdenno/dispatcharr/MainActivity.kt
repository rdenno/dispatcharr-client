package com.rdenno.dispatcharr

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import com.rdenno.dispatcharr.data.AuthState
import com.rdenno.dispatcharr.ui.common.LoadingBox
import com.rdenno.dispatcharr.ui.common.LocalMessenger
import com.rdenno.dispatcharr.ui.common.Messenger
import com.rdenno.dispatcharr.ui.login.LoginScreen
import com.rdenno.dispatcharr.ui.nav.AppScaffold
import com.rdenno.dispatcharr.ui.theme.DispatcharrTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        App.session.bootstrap()

        setContent {
            DispatcharrTheme {
                val snackbarHostState = remember { SnackbarHostState() }
                val scope = rememberCoroutineScope()
                val messenger = remember(snackbarHostState, scope) { Messenger(snackbarHostState, scope) }

                val authState by App.session.auth.collectAsState()

                CompositionLocalProvider(LocalMessenger provides messenger) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        when (authState) {
                            AuthState.Checking -> LoadingBox()
                            AuthState.LoggedOut -> LoginScreen()
                            AuthState.LoggedIn -> AppScaffold()
                        }
                    }
                    SnackbarHost(hostState = snackbarHostState)
                }
            }
        }
    }
}
