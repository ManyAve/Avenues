plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("app.cash.paparazzi")
}

// The tokens are generated once for both platforms (`bun run tokens:native`, native/AvenueTokens.kt). The module
// compiles that file where it is instead of keeping a copy that could drift.
val tokens = layout.buildDirectory.dir("generated/avenue-tokens")
val syncTokens = tasks.register<Sync>("syncAvenueTokens") {
    from(rootProject.file("../AvenueTokens.kt"))
    into(tokens)
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
    sourceSets.getByName("main").kotlin.srcDir(syncTokens)
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        allWarningsAsErrors.set(true)
    }
}

dependencies {
    val bom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(bom)
    api("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    testImplementation("junit:junit:4.13.2")
}
