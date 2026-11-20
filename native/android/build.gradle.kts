// Avenue's Compose components. Two kinds of version live here, and they move differently:
// - The build tools below (AGP, the Kotlin compiler, Paparazzi; Gradle in the wrapper) only build this module and record
//   its screenshots, so they track the newest releases, prereleases included.
// - What the apps compile is the source, so the source stays at the oldest toolchain an app builds with: Neighbors (AGP
//   8.9, Kotlin 2.0, Compose BOM 2024.12). avenue/build.gradle.kts pins Kotlin's language and API level to 2.0 and holds
//   the Compose BOM at 2024.12.01; raise those only once Neighbors raises its own (AVE-173). Management's newer
//   toolchain reads the same source.
plugins {
    // AGP 9 compiles Kotlin itself (built-in Kotlin), so there is no org.jetbrains.kotlin.android plugin. The Compose
    // compiler plugin's version sets the Kotlin compiler AGP uses.
    id("com.android.library") version "9.6.0-alpha04" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.4.21" apply false
    id("app.cash.paparazzi") version "2.0.0-alpha05.1" apply false
}
