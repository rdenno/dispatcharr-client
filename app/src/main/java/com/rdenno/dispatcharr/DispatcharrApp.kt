package com.rdenno.dispatcharr

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.decode.SvgDecoder
import com.rdenno.dispatcharr.data.ApiClient
import com.rdenno.dispatcharr.data.Prefs
import com.rdenno.dispatcharr.data.Session

/** Simple service locator. Access via `App.session`, `App.api`, `App.prefs`. */
class DispatcharrApp : Application(), ImageLoaderFactory {
    override fun onCreate() {
        super.onCreate()
        val prefs = Prefs(this)
        val api = ApiClient(prefs)
        App.prefs = prefs
        App.api = api
        App.session = Session(api, prefs)
    }

    override fun newImageLoader(): ImageLoader = ImageLoader.Builder(this)
        .okHttpClient { App.api.authedHttp }
        .components { add(SvgDecoder.Factory()) }
        .crossfade(true)
        .build()
}

object App {
    lateinit var prefs: Prefs
    lateinit var api: ApiClient
    lateinit var session: Session
}
