plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

fun loadDotenv(): Map<String, String> {
    val candidates = sequenceOf(
        rootProject.projectDir.resolve(".env"),
        rootProject.projectDir.parentFile?.resolve(".env"),
        rootProject.projectDir.parentFile?.parentFile?.resolve(".env"),
    ).filterNotNull()
    val file = candidates.firstOrNull { it.isFile } ?: return emptyMap()
    return file.readLines()
        .map { it.trim() }
        .filter { it.isNotEmpty() && !it.startsWith("#") && it.contains("=") }
        .associate { line ->
            val key = line.substringBefore("=").trim()
            val rawValue = line.substringAfter("=").trim()
            val value = rawValue
                .removeSurrounding("\"")
                .removeSurrounding("'")
            key to value
        }
}

val dotenv = loadDotenv()

fun envOrDotenv(key: String): String = System.getenv(key) ?: dotenv[key].orEmpty()

fun quotedBuildConfig(value: String?): String = "\"${value.orEmpty().replace("\\", "\\\\").replace("\"", "\\\"")}\""

android {
    namespace = "com.wxxtae.pws.nativepreview"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.wxxtae.pws.nativepreview"
        minSdk = 24
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0-native-preview"

        buildConfigField("String", "EXPO_PUBLIC_SUPABASE_URL", quotedBuildConfig(envOrDotenv("EXPO_PUBLIC_SUPABASE_URL")))
        buildConfigField("String", "EXPO_PUBLIC_SUPABASE_ANON_KEY", quotedBuildConfig(envOrDotenv("EXPO_PUBLIC_SUPABASE_ANON_KEY")))
    }

    buildTypes {
        debug {
            buildConfigField("String", "EXPO_PUBLIC_TEST_PASSWORD", quotedBuildConfig(envOrDotenv("EXPO_PUBLIC_TEST_PASSWORD")))
        }
        release {
            buildConfigField("String", "EXPO_PUBLIC_TEST_PASSWORD", quotedBuildConfig(""))
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.activity:activity-compose:1.9.0")
    implementation("androidx.compose.runtime:runtime-android:1.9.0")
    implementation("androidx.compose.ui:ui-android:1.9.0")
    implementation("androidx.compose.ui:ui-tooling-preview-android:1.9.0")
    implementation("androidx.compose.foundation:foundation-android:1.9.0")
    implementation("androidx.compose.foundation:foundation-layout-android:1.9.0")
    implementation("androidx.navigation:navigation-compose-android:2.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx-android:2.9.0")
    implementation("androidx.security:security-crypto:1.1.0")
    debugImplementation("androidx.compose.ui:ui-tooling-android:1.9.0")
    testImplementation("junit:junit:4.13.2")
}
