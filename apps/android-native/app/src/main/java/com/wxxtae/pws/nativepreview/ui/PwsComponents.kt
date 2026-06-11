package com.wxxtae.pws.nativepreview.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.LocalIndication
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val PwsBlueGradient: Brush
    @Composable get() = Brush.horizontalGradient(listOf(PwsColor.AccentLight, PwsColor.Accent))

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
    PwsText(
        text = text,
        modifier = modifier,
        size = PwsType.Header,
        lineHeight = 31.sp,
        weight = FontWeight.SemiBold,
        color = PwsColor.TextPrimary,
    )
}

@Composable
fun PwsSectionTitle(text: String, modifier: Modifier = Modifier, large: Boolean = true) {
    PwsText(
        text = text,
        modifier = modifier,
        size = if (large) PwsType.Section else PwsType.SectionSmall,
        lineHeight = if (large) 24.sp else 20.sp,
        weight = FontWeight.SemiBold,
        color = PwsColor.TextPrimary,
    )
}

@Composable
fun PwsBody(text: String, modifier: Modifier = Modifier, color: Color = PwsColor.TextSecondary) {
    PwsText(
        text = text,
        modifier = modifier,
        size = PwsType.Body,
        lineHeight = 23.sp,
        weight = FontWeight.Normal,
        color = color,
    )
}

@Composable
fun PwsCaption(text: String, modifier: Modifier = Modifier, color: Color = PwsColor.TextTertiary) {
    PwsText(
        text = text,
        modifier = modifier,
        size = PwsType.Caption,
        lineHeight = 18.sp,
        weight = FontWeight.Normal,
        color = color,
    )
}

@Composable
fun PwsText(
    text: String,
    modifier: Modifier = Modifier,
    size: androidx.compose.ui.unit.TextUnit,
    lineHeight: androidx.compose.ui.unit.TextUnit,
    weight: FontWeight = FontWeight.Normal,
    color: Color = PwsColor.TextPrimary,
    align: TextAlign = TextAlign.Start,
) {
    BasicText(
        text = text,
        modifier = modifier,
        style = TextStyle(
            color = color,
            fontSize = size,
            lineHeight = lineHeight,
            fontWeight = weight,
            textAlign = align,
        ),
    )
}

@Composable
fun PwsCard(
    modifier: Modifier = Modifier,
    radius: androidx.compose.ui.unit.Dp = PwsRadius.Md,
    background: Color = PwsColor.Surface,
    border: Color = PwsColor.Border,
    contentPadding: PaddingValues = PaddingValues(PwsSpace.Lg),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radius))
            .background(background)
            .border(BorderStroke(1.dp, border), RoundedCornerShape(radius))
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
        content = content,
    )
}

@Composable
fun PwsGradientCard(
    modifier: Modifier = Modifier,
    radius: androidx.compose.ui.unit.Dp = PwsRadius.Lg,
    contentPadding: PaddingValues = PaddingValues(PwsSpace.Lg),
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(radius))
            .background(PwsBlueGradient)
            .padding(contentPadding),
        verticalArrangement = Arrangement.spacedBy(PwsSpace.Md),
        content = content,
    )
}

@Composable
fun PwsPrimaryButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, onClick: () -> Unit = {}) {
    val shape = RoundedCornerShape(PwsRadius.Md)
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .scale(if (pressed && enabled) 0.985f else 1f)
            .clip(shape)
            .background(if (enabled) PwsColor.TextPrimary else PwsColor.SurfaceSecondary)
            .semantics {
                role = Role.Button
                contentDescription = text
            }
            .clickable(
                enabled = enabled,
                interactionSource = interactionSource,
                indication = LocalIndication.current,
                onClick = onClick,
            )
            .padding(horizontal = PwsSpace.Lg, vertical = 15.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            maxLines = 1,
            softWrap = false,
            style = TextStyle(
                color = if (enabled) Color.White else PwsColor.TextMuted,
                fontSize = 16.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            ),
        )
    }
}

@Composable
fun PwsGradientButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit = {}) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    Box(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 52.dp)
            .scale(if (pressed) 0.985f else 1f)
            .clip(RoundedCornerShape(PwsRadius.Md))
            .background(PwsBlueGradient)
            .semantics {
                role = Role.Button
                contentDescription = text
            }
            .clickable(
                interactionSource = interactionSource,
                indication = LocalIndication.current,
                onClick = onClick,
            )
            .padding(horizontal = PwsSpace.Lg, vertical = 15.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            maxLines = 1,
            softWrap = false,
            style = TextStyle(
                color = Color.White,
                fontSize = 16.sp,
                lineHeight = 22.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
            ),
        )
    }
}

@Composable
fun PwsSecondaryPill(text: String, modifier: Modifier = Modifier) {
    PwsChip(text = text, modifier = modifier)
}

@Composable
fun PwsChip(
    text: String,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    background: Color = if (selected) PwsColor.Accent else PwsColor.SurfaceTertiary,
    textColor: Color = if (selected) Color.White else PwsColor.TextSecondary,
) {
    Box(
        modifier = modifier
            .heightIn(min = 36.dp)
            .clip(RoundedCornerShape(PwsRadius.Pill))
            .background(background)
            .border(BorderStroke(1.dp, if (selected) background else PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Pill))
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        BasicText(
            text = text,
            maxLines = 1,
            softWrap = false,
            style = TextStyle(
                color = textColor,
                fontSize = PwsType.Caption,
                lineHeight = 18.sp,
                fontWeight = FontWeight.Normal,
                textAlign = TextAlign.Center,
            ),
        )
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
fun PwsSettingRow(label: String, value: String? = null, modifier: Modifier = Modifier, trailing: @Composable RowScope.() -> Unit = {}) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 48.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        PwsBody(label, modifier = Modifier.weight(1f), color = PwsColor.TextPrimary)
        if (value != null) {
            PwsCaption(value, color = PwsColor.TextTertiary)
            Spacer(Modifier.width(PwsSpace.Sm))
        }
        trailing()
    }
}

@Composable
fun PwsToggle(enabled: Boolean) {
    Box(
        modifier = Modifier
            .size(width = 46.dp, height = 28.dp)
            .clip(RoundedCornerShape(PwsRadius.Pill))
            .background(if (enabled) PwsColor.Accent else PwsColor.BorderStrong)
            .padding(3.dp),
        contentAlignment = if (enabled) Alignment.CenterEnd else Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .size(22.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .background(Color.White),
        )
    }
}

@Composable
fun PwsStaticSlider(value: Float) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(18.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .background(PwsColor.BorderStrong),
        )
        Box(
            modifier = Modifier
                .fillMaxWidth(value.coerceIn(0f, 1f))
                .height(4.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .background(PwsBlueGradient),
        )
        Box(
            modifier = Modifier
                .padding(start = ((value.coerceIn(0f, 1f) * 220).dp))
                .size(18.dp)
                .clip(RoundedCornerShape(PwsRadius.Pill))
                .background(Color.White)
                .border(BorderStroke(2.dp, PwsColor.Accent), RoundedCornerShape(PwsRadius.Pill)),
        )
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
fun PwsDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(PwsColor.Border),
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
                .clip(RoundedCornerShape(PwsRadius.Lg))
                .background(PwsColor.Surface)
                .border(BorderStroke(1.dp, PwsColor.BorderStrong), RoundedCornerShape(PwsRadius.Lg))
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
                PwsPrimaryButton(
                    text = primaryLabel,
                    modifier = Modifier.weight(1f),
                    onClick = onPrimary,
                    enabled = true,
                )
            }
        }
    }
}
