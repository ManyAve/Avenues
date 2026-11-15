// Avenue's Compose components. Versions are the oldest the two apps build with (Neighbors: AGP 8.9, Kotlin 2.0,
// Compose BOM 2024.12), so source that compiles here compiles in both; Management's newer toolchain reads it too.
plugins {
    id("com.android.library") version "8.9.3" apply false
    id("org.jetbrains.kotlin.android") version "2.0.21" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.0.21" apply false
    id("app.cash.paparazzi") version "1.3.5" apply false
}
