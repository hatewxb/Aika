// hls-lite.js — a minimal HLS player for Steam store trailers (Media Source Extensions).
//
// Steam stopped serving plain mp4/webm trailers: the store page only knows
// an HLS master playlist (trailers[].hlsManifest in the gamehighlight carousel
// props). Every variant is fragmented MP4 (#EXT-X-MAP init + ~3 s chunks,
// H.264 video and a separate AAC audio rendition), CORS is open — so a few
// dozen lines of MSE are enough; no hls.js.
//
// Not a general HLS player: VOD only, fMP4 only, no encryption, no adaptive
// switching (a variant is picked once by height). Seeking is supported.
//
//   const p = new HlsLite(video, masterUrl, { height: 720, audio: false });
//   await p.ready;   // rejects if the trailer can't be played this way
//   p.destroy();

const BUFFER_AHEAD = 24;   // seconds kept loaded in front of the playhead
const BUFFER_BEHIND = 40;  // seconds kept behind it (older data is evicted)

const parseAttrs = (line) => {
  const out = {};
  line.replace(/([A-Z0-9-]+)=("[^"]*"|[^,]*)/g, (_, k, v) => { out[k] = v.replace(/^"|"$/g, ""); });
  return out;
};

const fetchText = async (url, signal) => {
  const r = await fetch(url, { signal });
  if (!r.ok) throw new Error("HTTP " + r.status + " " + url);
  return r.text();
};

// A media playlist → { init, segments: [{ url, start, dur }], duration }
const parseMedia = (text, base) => {
  let init = null, t = 0, dur = 0;
  const segments = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#EXT-X-MAP:")) init = new URL(parseAttrs(line.slice(11)).URI, base).href;
    else if (line.startsWith("#EXT-X-KEY")) throw new Error("encrypted");
    else if (line.startsWith("#EXTINF:")) dur = parseFloat(line.slice(8));
    else if (!line.startsWith("#")) {
      segments.push({ url: new URL(line, base).href, start: t, dur });
      t += dur;
    }
  }
  if (!init || !segments.length) throw new Error("not fMP4");
  return { init, segments, duration: t };
};

// The master playlist → the video variant closest to `height` (not above it,
// unless nothing is smaller) and the default audio rendition
const parseMaster = (text, base, height) => {
  const lines = text.split("\n").map((l) => l.trim());
  const variants = [], audio = {};
  lines.forEach((line, i) => {
    if (line.startsWith("#EXT-X-MEDIA:")) {
      const a = parseAttrs(line.slice(13));
      if (a.TYPE === "AUDIO" && a.URI && (a.DEFAULT === "YES" || !audio[a["GROUP-ID"]])) {
        audio[a["GROUP-ID"]] = new URL(a.URI, base).href;
      }
    } else if (line.startsWith("#EXT-X-STREAM-INF:")) {
      const a = parseAttrs(line.slice(18));
      const codecs = (a.CODECS || "").split(",").map((c) => c.trim());
      variants.push({
        url: new URL(lines[i + 1], base).href,
        h: parseInt((a.RESOLUTION || "x0").split("x")[1], 10),
        video: codecs.find((c) => /^(avc|hvc|hev|av01|vp09)/.test(c)) || "avc1.640029",
        audioCodec: codecs.find((c) => /^mp4a/.test(c)) || "mp4a.40.2",
        audio: a.AUDIO ? audio[a.AUDIO] : null,
      });
    }
  });
  if (!variants.length) throw new Error("no variants");
  variants.sort((a, b) => a.h - b.h);
  const fit = variants.filter((v) => v.h <= height);
  const v = fit.length ? fit[fit.length - 1] : variants[0];
  // EXT-X-MEDIA may come after the variant lines — resolve audio once more
  return { ...v, audio: v.audio || Object.values(audio)[0] || null };
};

class Track {
  constructor(player, playlist, mime) {
    this.p = player;
    this.list = playlist;
    this.mime = mime;
    this.sb = null;
    this.next = 0;        // index of the next segment to append
    this.busy = false;
    this.initDone = false;
    this.gen = 0;         // bumps on seek — stale fetches are dropped
  }

  open(ms) {
    this.sb = ms.addSourceBuffer(this.mime);
    this.sb.mode = "segments";
    this.sb.addEventListener("updateend", () => this.p.pump());
  }

  append(buf) {
    return new Promise((resolve, reject) => {
      const done = () => { this.sb.removeEventListener("error", fail); resolve(); };
      const fail = () => { this.sb.removeEventListener("updateend", done); reject(new Error("append")); };
      this.sb.addEventListener("updateend", done, { once: true });
      this.sb.addEventListener("error", fail, { once: true });
      this.sb.appendBuffer(buf);
    });
  }

  bufferedEnd(t) {
    const b = this.sb.buffered;
    for (let i = 0; i < b.length; i++) if (b.start(i) <= t + 0.3 && b.end(i) > t) return b.end(i);
    return t;
  }

  seekTo(t) {
    const segs = this.list.segments;
    let i = segs.findIndex((s) => s.start + s.dur > t);
    if (i < 0) i = segs.length;
    if (this.bufferedEnd(t) > t + 0.5) return; // already loaded around t
    this.next = i;
    this.gen++;
  }

  async step() {
    if (this.busy || !this.sb || this.sb.updating) return;
    const v = this.p.video;
    const segs = this.list.segments;
    if (this.next >= segs.length) return;
    if (this.initDone && segs[this.next].start > v.currentTime + BUFFER_AHEAD) return;

    this.busy = true;
    const gen = this.gen;
    try {
      // Evict what's far behind (long trailers in the viewer)
      if (v.currentTime > BUFFER_BEHIND && this.sb.buffered.length && this.sb.buffered.start(0) < v.currentTime - BUFFER_BEHIND) {
        await new Promise((res) => {
          this.sb.addEventListener("updateend", res, { once: true });
          this.sb.remove(0, v.currentTime - BUFFER_BEHIND / 2);
        });
      }
      if (!this.initDone) {
        await this.append(await this.p.load(this.list.init));
        this.initDone = true;
      }
      const idx = this.next;
      const data = await this.p.load(segs[idx].url);
      if (gen !== this.gen || this.p.dead) return;
      await this.append(data);
      if (gen === this.gen) this.next = idx + 1;
    } catch (e) {
      if (!this.p.dead && e.name !== "AbortError") this.p.fail(e);
    } finally {
      this.busy = false;
      if (!this.p.dead) this.p.pump();
    }
  }

  get done() { return this.next >= this.list.segments.length && !this.busy; }
}

export class HlsLite {
  constructor(video, masterUrl, { height = 720, audio = false } = {}) {
    this.video = video;
    this.dead = false;
    this.ac = new AbortController();
    this.tracks = [];
    this.ready = new Promise((res, rej) => { this._res = res; this._rej = rej; });
    this.ready.catch(() => {}); // the caller decides whether to listen
    this.start(masterUrl, height, audio).catch((e) => this.fail(e));
  }

  load(url) {
    return fetch(url, { signal: this.ac.signal }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.arrayBuffer();
    });
  }

  async start(masterUrl, height, wantAudio) {
    if (!window.MediaSource) throw new Error("no MSE");
    const sig = this.ac.signal;
    const v = parseMaster(await fetchText(masterUrl, sig), masterUrl, height);
    const vMime = 'video/mp4; codecs="' + v.video + '"';
    if (!MediaSource.isTypeSupported(vMime)) throw new Error("unsupported " + vMime);

    const lists = [fetchText(v.url, sig).then((t) => parseMedia(t, v.url))];
    const aMime = 'audio/mp4; codecs="' + v.audioCodec + '"';
    const withAudio = wantAudio && v.audio && MediaSource.isTypeSupported(aMime);
    if (withAudio) lists.push(fetchText(v.audio, sig).then((t) => parseMedia(t, v.audio)));
    const [vl, al] = await Promise.all(lists);
    if (this.dead) return;

    this.tracks.push(new Track(this, vl, vMime));
    if (al) this.tracks.push(new Track(this, al, aMime));

    const ms = this.ms = new MediaSource();
    this.url = URL.createObjectURL(ms);
    await new Promise((res) => {
      ms.addEventListener("sourceopen", res, { once: true });
      this.video.src = this.url;
    });
    if (this.dead) return;
    ms.duration = vl.duration;
    this.tracks.forEach((t) => t.open(ms));

    this.onTime = () => this.pump();
    this.onSeek = () => { this.tracks.forEach((t) => t.seekTo(this.video.currentTime)); this.pump(); };
    this.video.addEventListener("timeupdate", this.onTime);
    this.video.addEventListener("seeking", this.onSeek);
    this.video.addEventListener("loadeddata", () => this._res(this), { once: true });
    this.pump();
  }

  pump() {
    // "ended" too: after endOfStream a seek back needs new appends (they reopen it)
    if (this.dead || !this.ms || this.ms.readyState === "closed") return;
    this.tracks.forEach((t) => t.step());
    if (this.ms.readyState === "open" && this.tracks.length && this.tracks.every((t) => t.done) && !this.tracks.some((t) => t.sb.updating)) {
      try { this.ms.endOfStream(); } catch (e) { /* a seek reopened it */ }
    }
  }

  fail(e) {
    if (this.dead) return;
    this._rej(e);
  }

  destroy() {
    if (this.dead) return;
    this.dead = true;
    this.ac.abort();
    this._rej(new Error("destroyed"));
    if (this.onTime) {
      this.video.removeEventListener("timeupdate", this.onTime);
      this.video.removeEventListener("seeking", this.onSeek);
    }
    this.video.removeAttribute("src");
    this.video.load();
    if (this.url) URL.revokeObjectURL(this.url);
  }
}
