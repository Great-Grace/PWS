import { borderRadius, colors, layout, shadows, spacing } from '../src/theme';

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(colors.accent === '#0A84FF', 'primary action color should use the Figma-aligned Android action blue');
assert(colors.background === '#FAFAF9', 'app background should use the warm Figma parchment surface');
assert(colors.surface === '#FFFFFF', 'main surface should remain pure white');
assert(colors.surfaceSecondary === '#F4F1EC', 'secondary surface should stay warm and quiet');
assert(colors.textPrimary === '#211E1B', 'primary text should use warm near-black ink');

assert(spacing.md === 17, 'body rhythm should include the Apple 17px spacing step');
assert(spacing.lg === 24, 'card and section padding should keep the 24px structural step');
assert(borderRadius.lg === 18, 'utility cards should use the 18px large radius');
assert(borderRadius.full === 9999, 'action controls should support full pill radius');

assert(layout.screenPadding === 24, 'screen padding should be explicitly tokenized');
assert(layout.touchTarget === 44, 'touch targets should be at least 44px');
assert(shadows.card.shadowOpacity === 0.08, 'cards should use only a restrained Figma-style elevation');
assert(shadows.product.shadowRadius > 0, 'product-like hero moments may use the single soft product shadow');
