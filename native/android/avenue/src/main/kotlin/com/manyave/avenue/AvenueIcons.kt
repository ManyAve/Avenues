package com.manyave.avenue

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.addPathNodes
import androidx.compose.ui.unit.dp

/**
 * The Lucide icons Avenue's components draw on the web (lucide-react, ISC licence), as Compose vectors, so a check
 * or a warning looks the same on both. Avenue doesn't ship an icon set: an app passes its own icons where a component
 * takes one (EmptyState's icon). These are only the ones the components draw themselves, plus Inbox for examples.
 */
object AvenueIcons {
    val Check: ImageVector = lucide("Check", "M20 6 9 17l-5-5")
    val CircleAlert: ImageVector = lucide("CircleAlert", CIRCLE, "M12 8v4", "M12 16h.01")
    val TriangleAlert: ImageVector = lucide(
        "TriangleAlert",
        "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        "M12 9v4",
        "M12 17h.01",
    )
    val Info: ImageVector = lucide("Info", CIRCLE, "M12 16v-4", "M12 8h.01")
    val Plus: ImageVector = lucide("Plus", "M5 12h14", "M12 5v14")
    val LoaderCircle: ImageVector = lucide("LoaderCircle", "M21 12a9 9 0 1 1-6.219-8.56")
    val Inbox: ImageVector = lucide(
        "Inbox",
        "M22 12h-6l-2 3h-4l-2-3H2",
        "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
    )
}

private const val CIRCLE = "M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z"

/** A 24-unit Lucide icon: 2-unit round strokes, tinted by the Icon that draws it. */
private fun lucide(name: String, vararg paths: String): ImageVector =
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f).apply {
        for (d in paths) {
            addPath(
                pathData = addPathNodes(d),
                stroke = SolidColor(Color.Black),
                strokeLineWidth = 2f,
                strokeLineCap = StrokeCap.Round,
                strokeLineJoin = StrokeJoin.Round,
            )
        }
    }.build()
