# Aika 0.1.8 validation

The release integrates PR #15 by AriCuteGirl with the current theme features
and maintainer compatibility corrections. PR #16 is deliberately excluded.

- 15 Node regression tests pass: parser, Linux-only startup, failure fallback,
  manifest integration, pointer effects and wishlist SPA route lifecycle.
- 10 isolated CEF compatibility checks pass against the final source: Windows
  menus, Linux sizing and last-item access, negative monitor coordinates,
  alias observation and native ban-warning colors.
- Real Windows Steam checks cover centered navigation, repeated tab hover,
  Specials & Events page changes, all five store menus, full calendar,
  wishlist entry/exit/re-entry, actual SIH blocks and activity comments.
- Discount, new-release, calendar, label, comment, SIH and loader fixtures pass
  in Aika, Hello Bert, Greeny and Rose Ash. Discount-text contrast exceeds 11:1.
- The wishlist backdrop renders 15 frames in a 500 ms sample, with no WebGL
  errors. A title update produces one decorative copy with the correct text.
- Auto-Claim's current toolbar markup was tested at wide and narrow client
  widths: its button stays visible and receives pointer input. The plugin's
  claiming/scanning operations were not invoked.
- Store loading uses an accent orbit; reduced motion disables the animation.
  Native popup roots remain transparent with inset-only rounded menu borders.

Short hover/scroll samples are not a general performance guarantee. Steam's
initial game-page React loading can still produce long tasks (issue #14).
Native Linux compositor and Wayland/DPI behavior on the exact integrated
revision remain for community validation; no VM was used.
