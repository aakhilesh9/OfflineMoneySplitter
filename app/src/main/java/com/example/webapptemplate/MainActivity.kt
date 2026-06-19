package com.example.splitmoneyoffline

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.*
import android.widget.Toast
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.example.splitmoneyoffline.databinding.ActivityMainBinding
import com.google.android.material.color.DynamicColors
import java.io.File
import java.io.FileOutputStream

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var filePathCallback: ValueCallback<Array<Uri>>? = null

    private val filePickerLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val data: Intent? = result.data
            val results = WebChromeClient.FileChooserParams.parseResult(result.resultCode, data)
            filePathCallback?.onReceiveValue(results)
        } else {
            filePathCallback?.onReceiveValue(null)
        }
        filePathCallback = null
    }

    private var exportData: String? = null
    private val fileSaverLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            result.data?.data?.let { uri ->
                saveExportFile(uri)
            }
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        DynamicColors.applyToActivityIfAvailable(this)
        super.onCreate(savedInstanceState)

        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        ViewCompat.setOnApplyWindowInsetsListener(binding.root) { v, insets ->
            val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
            insets
        }

        val webView: WebView = binding.webView

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            cacheMode = WebSettings.LOAD_DEFAULT
            databaseEnabled = true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                isAlgorithmicDarkeningAllowed = true
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                if (url.startsWith("mailto:") || url.startsWith("https://wa.me") || url.startsWith("whatsapp:") || url.startsWith("https://instagram.com") || url.startsWith("tel:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Toast.makeText(this@MainActivity, "No app found to handle this link", Toast.LENGTH_SHORT).show()
                        return true
                    }
                }
                return false
            }
        }
        
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                filePathCallback = callback
                val intent = params?.createIntent()
                if (intent == null) {
                    filePathCallback = null
                    return false
                }
                try {
                    filePickerLauncher.launch(intent)
                } catch (e: Exception) {
                    filePathCallback = null
                    return false
                }
                return true
            }
        }

        webView.addJavascriptInterface(WebAppInterface(this), "Android")
        webView.loadUrl("file:///android_asset/index.html")
    }

    fun triggerExport(data: String, mimeType: String, fileName: String) {
        exportData = data
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = mimeType
            putExtra(Intent.EXTRA_TITLE, fileName)
        }
        fileSaverLauncher.launch(intent)
    }

    private fun saveExportFile(uri: Uri) {
        try {
            contentResolver.openOutputStream(uri)?.use { outputStream ->
                outputStream.write(exportData?.toByteArray() ?: ByteArray(0))
            }
            Toast.makeText(this, "File saved successfully!", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Failed to save file", Toast.LENGTH_SHORT).show()
        }
    }
}

class WebAppInterface(private val activity: MainActivity) {

    @JavascriptInterface
    fun printHtml(html: String) {
        Handler(Looper.getMainLooper()).post {
            val webView = WebView(activity)
            webView.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    val printManager = activity.getSystemService(Context.PRINT_SERVICE) as PrintManager
                    val jobName = "Money Split Report"
                    val printAdapter = view?.createPrintDocumentAdapter(jobName)
                    printManager.print(jobName, printAdapter!!, PrintAttributes.Builder().build())
                }
            }
            webView.loadDataWithBaseURL(null, html, "text/HTML", "UTF-8", null)
        }
    }

    @JavascriptInterface
    fun exportData(json: String) {
        activity.runOnUiThread {
            activity.triggerExport(json, "application/json", "money_split_backup_${System.currentTimeMillis() / 1000}.json")
        }
    }

    @JavascriptInterface
    fun exportFile(data: String, mimeType: String, fileName: String) {
        activity.runOnUiThread {
            activity.triggerExport(data, mimeType, fileName)
        }
    }

    @JavascriptInterface
    fun shareText(text: String) {
        val sendIntent: Intent = Intent().apply {
            action = Intent.ACTION_SEND
            putExtra(Intent.EXTRA_TEXT, text)
            type = "text/plain"
        }
        val shareIntent = Intent.createChooser(sendIntent, "Share Report via")
        activity.startActivity(shareIntent)
    }
}