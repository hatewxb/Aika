// Why an animation runs on the main thread instead of the compositor:
// records a short trace and prints Chromium's "compositeFailed" reasons per
// animation (the same data DevTools shows as "Failed to composite").
//   node tools/anim-why.js "<window title part>" [seconds=2]
const target = require("./target");
const [win, secArg] = process.argv.slice(2);
const sec = +(secArg || 2);

// Chromium's CompositorAnimations::FailureReason bits (third_party/blink, 2024)
const REASONS = [
  "AcceleratedAnimationsDisabled", "EffectSuppressedByDevtools", "InvalidAnimationOrEffect",
  "EffectHasUnsupportedTimingParameters", "EffectHasNonReplaceCompositeMode", "TargetHasInvalidCompositingState",
  "TargetHasIncompatibleAnimations", "TargetHasCSSOffset", "AnimationAffectsNonCSSProperties",
  "TransformRelatedPropertyCannotBeAcceleratedOnTarget", "FilterRelatedPropertyMayMovePixels",
  "UnsupportedCSSProperty", "MixedKeyframeValueTypes", "TimelineSourceHasInvalidCompositingState",
  "AnimationHasNoVisibleChange", "AffectsImportantProperty", "SVGTargetHasIndependentTransformProperty",
  "InvalidPaintWorkletAnimation", "NotSupportedByCompositor",
];
const decode = (bits) => REASONS.filter((_, i) => bits & (1 << i)).join(", ") || String(bits);

(async () => {
  const ws = new WebSocket(await target(win));
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const events = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Tracing.dataCollected") events.push(...m.params.value);
    if (m.method === "Tracing.tracingComplete") done();
  };
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params }));
  send("Tracing.start", { categories: "blink.animations,devtools.timeline,disabled-by-default-devtools.timeline", transferMode: "ReportEvents" });
  // make the page restart its animations so their start events land in the trace
  setTimeout(() => send("Runtime.evaluate", { expression: "document.getAnimations().forEach(a => { const t = a.currentTime; a.cancel(); a.play(); a.currentTime = t; })" }), 200);
  setTimeout(() => send("Tracing.end"), sec * 1000);
  function done() {
    const seen = new Map();
    for (const ev of events) {
      const d = ev.args && ev.args.data;
      if (!d) continue;
      if (d.compositeFailed !== undefined || d.unsupportedProperties) {
        const key = (d.name || ev.name) + " | failed: " + decode(d.compositeFailed || 0) + (d.unsupportedProperties ? " | props: " + d.unsupportedProperties.join(",") : "");
        seen.set(key, (seen.get(key) || 0) + 1);
      }
    }
    if (!seen.size) console.log("no compositeFailed records (all composited, or nothing started)");
    for (const [k, v] of seen) console.log(v + "x " + k);
    process.exit(0);
  }
})();
