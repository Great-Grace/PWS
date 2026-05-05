package com.wxxtae.pws.nativepreview.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun PwsScreen(
    modifier: Modifier = Modifier,
    contentPadding: PaddingValues = PaddingValues(horizontal = PwsSpace.Lg, vertical = PwsSpace.Lg),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .background(PwsColor.Background)
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Lg),
        content = content,
    )
}

@Composable
fun PwsTitle(text: String, modifier: Modifier = Modifier) {
    BasicText(
        text = text,
        modifier = modifier,
        style = TextStyle(
            color = PwsColor.TextPrimary,
            fontSize = PwsType.Title,
            lineHeight = 36.sp,
            fontWeight = FontWeight.SemiBold,
        ),
    )
}

@Composable
fun PwsBody(text: String, modifier: Modifier = Modifier, color: Color = PwsColor.TextSecondary) {
    BasicText(
        text = text,
        modifier = modifier,
        style = TextStyle(
            color = color,
            fontSize = PwsType.Body,
            lineHeight = 24.sp,
            fontWeight = FontWeight.Normal,
        ),
    )
}

@Composable
fun PwsCaption(text: String, modifier: Modifier = Modifier, color: Color = PwsColor.TextTertiary) {
    BasicText(
        text = text,
        modifier = modifier,
        style = TextStyle(
            color = color,
            fontSize = PwsType.Caption,
            lineHeight = 18.sp,
        ),
    )
}

@Composable
fun PwsCard(modifier: Modifier = Modifier, content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(PwsRadius.Lg))
            .background(PwsColor.Surface)
            .border(BorderStroke(1.dp, PwsColor.Border), RoundedCornerShape(PwsRadius.Lg))
            .padding(PwsSpace.Lg),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
        content = content,
    )
}

@Composable
fun PwsPrimaryButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = PwsSpace.TouchTarget)
            .clip(RoundedCornerShape(PwsRadius.Pill))
            .background(PwsColor.Accent)
            .clickable(onClick = onClick)
            .padding(horizontal = PwsSpace.Lg, vertical = 13.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            style = TextStyle(
                color = Color.White,
                fontSize = PwsType.Body,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            ),
        )
    }
}

@Composable
fun PwsSecondaryPill(text: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(PwsRadius.Pill))
            .background(PwsColor.SurfaceSecondary)
            .border(BorderStroke(1.dp, PwsColor.Border), RoundedCornerShape(PwsRadius.Pill))
            .padding(horizontal = PwsSpace.Md, vertical = PwsSpace.Sm),
        contentAlignment = Alignment.Center,
    ) {
        PwsCaption(text = text, color = PwsColor.TextPrimary)
    }
}

@Composable
fun PwsRow(label: String, value: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        PwsBody(label, modifier = Modifier.weight(1f), color = PwsColor.TextPrimary)
        Spacer(Modifier.width(PwsSpace.Md))
        PwsCaption(value, color = PwsColor.TextSecondary)
    }
}

@Composable
fun PwsDot(color: Color = PwsColor.Accent) {
    Box(
        modifier = Modifier
            .size(8.dp)
            .clip(RoundedCornerShape(PwsRadius.Pill))
            .background(color),
    )
}

@Composable
fun PwsDialog(
    title: String,
    message: String,
    primaryLabel: String,
    onPrimary: () -> Unit,
    secondaryLabel: String? = null,
    onSecondary: () -> Unit = onPrimary,
    destructive: Boolean = false,
) {
    androidx.compose.ui.window.Dialog(onDismissRequest = onSecondary) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(PwsRadius.Xl))
                .background(PwsColor.Surface)
                .border(BorderStroke(1.dp, PwsColor.Border), RoundedCornerShape(PwsRadius.Xl))
                .padding(PwsSpace.Lg),
            verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
        ) {
            PwsTitle(title)
            PwsBody(message)
            Row(horizontalArrangement = Arrangement.spacedBy(PwsSpace.Sm)) {
                if (secondaryLabel != null) {
                    PwsPrimaryButton(
                        text = secondaryLabel,
                        modifier = Modifier.weight(1f),
                        onClick = onSecondary,
                    )
                }
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = PwsSpace.TouchTarget)
                        .clip(RoundedCornerShape(PwsRadius.Pill))
                        .background(if (destructive) Color(0xFFB91C1C) else PwsColor.Accent)
                        .clickable(onClick = onPrimary)
                        .padding(horizontal = PwsSpace.Lg, vertical = 13.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    BasicText(
                        text = primaryLabel,
                        style = TextStyle(
                            color = Color.White,
                            fontSize = PwsType.Body,
                            lineHeight = 22.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center,
                        ),
                    )
                }
            }
        }
    }
}
