plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.plugin.compose")
    id("app.cash.paparazzi")
}

// The tokens are generated once for both platforms (`bun run tokens:native`, native/AvenueTokens.kt). The module
// compiles that file where it is instead of keeping a copy that could drift.
// It goes in through AGP's variant API, the way AGP 9 takes generated source, so the copy runs before compiling.
abstract class SyncAvenueTokens : DefaultTask() {
    @get:InputFile
    abstract val source: RegularFileProperty

    @get:OutputDirectory
    abstract val output: DirectoryProperty

    @TaskAction
    fun sync() {
        val out = output.get().asFile
        out.deleteRecursively()
        source.get().asFile.copyTo(out.resolve("AvenueTokens.kt"))
    }
}

val syncTokens = tasks.register<SyncAvenueTokens>("syncAvenueTokens") {
    source.set(rootProject.layout.projectDirectory.file("../AvenueTokens.kt"))
}

androidComponents {
    onVariants { variant -> variant.sources.kotlin?.addGeneratedSourceDirectory(syncTokens, SyncAvenueTokens::output) }
}

android {
    namespace = "com.manyave.avenue"
    compileSdk = 35
    defaultConfig { minSdk = 26 }
    buildFeatures { compose = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        // Neighbors' floor (root build.gradle.kts): a newer compiler builds this module, but the source may use only
        // what Kotlin 2.0 has, so it still compiles in Neighbors. Kotlin 2.4 deprecates level 2.0 with a warning, which
        // is the one warning let through; every other warning still fails the build.
        languageVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_0)
        apiVersion.set(org.jetbrains.kotlin.gradle.dsl.KotlinVersion.KOTLIN_2_0)
        freeCompilerArgs.add("-Xsuppress-version-warnings")
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    // Held at Neighbors' BOM (root build.gradle.kts), so the components use only the Compose APIs Neighbors has.
    val bom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(bom)
    api("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    testImplementation("junit:junit:4.13.2")
}
