// Installs a jsdom-backed browser environment so the game's real module
// graph can be imported under Node for behavioural tests. Only import-time
// side effects are covered (style injection, DOM probes, preloads);
// canvas/audio/network primitives are stubbed because jsdom has none.
import { JSDOM } from 'jsdom';

const noop = () => {};

function canvasCtxStub() {
    return new Proxy({}, {
        get(_t, k) {
            if (k === 'measureText') return () => ({ width: 0 });
            if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
            if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => ({ addColorStop: noop });
            if (k === 'canvas') return null;
            if (typeof k === 'string') return noop;
            return undefined;
        },
        set: () => true,
    });
}

export function installBrowserEnv() {
    if (globalThis.__stoxelsEnvInstalled) return globalThis.window;
    globalThis.__stoxelsEnvInstalled = true;

    const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
        url: 'http://localhost/',
        pretendToBeVisual: true,
    });
    const w = dom.window;

    // Report readyState 'loading' for the whole test: several modules run
    // their init INLINE when readyState is 'complete', and inside Node's
    // import order that happens before state.js finished initialising (the
    // browser never hits this because entry.mjs runs while the document is
    // still loading). With 'loading' those inits defer to DOMContentLoaded,
    // which jsdom has already fired - exactly the deferred behaviour we want.
    Object.defineProperty(w.document, 'readyState', { get: () => 'loading', configurable: true });

    globalThis.window = w;
    globalThis.document = w.document;
    globalThis.location = w.location;
    globalThis.localStorage = w.localStorage;
    globalThis.sessionStorage = w.sessionStorage;
    globalThis.getComputedStyle = w.getComputedStyle.bind(w);
    globalThis.requestAnimationFrame = w.requestAnimationFrame.bind(w);
    globalThis.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
    globalThis.alert = noop;
    globalThis.confirm = () => true;
    globalThis.prompt = () => null;
    globalThis.Image = w.Image;
    globalThis.Audio = class {
        constructor(src) { this.src = src || ''; this.readyState = 4; this.currentTime = 0; }
        play() { return Promise.resolve(); }
        pause() { return noop; }
        load() { return noop; }
        addEventListener() { return noop; }
    };
    w.HTMLCanvasElement.prototype.getContext = canvasCtxStub;

    // Network must never leak into tests: hand out a promise that never
    // settles (no unhandled rejections, no pending handles keeping Node up).
    const noNetwork = () => new Promise(() => {});
    globalThis.fetch = noNetwork;
    w.fetch = noNetwork;

    // No animation frames: an rAF loop would keep the test process alive
    // forever. Import-time code only schedules frames, it does not need one.
    globalThis.requestAnimationFrame = () => 0;
    globalThis.cancelAnimationFrame = noop;
    w.requestAnimationFrame = globalThis.requestAnimationFrame;
    w.cancelAnimationFrame = globalThis.cancelAnimationFrame;

    return w;
}
