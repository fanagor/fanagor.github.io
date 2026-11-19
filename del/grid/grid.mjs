import { cameraTarget } from './camera.mjs';

// Keep the same edge margins and pan timing as DEL's local animation.
export function gridView(canvas) {
    const ctx = canvas.getContext('2d');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let cols, rows, state, center, target, animation, lastTime;

    function draw() {
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        const ratio = window.devicePixelRatio || 1;
        const pixels = [Math.round(width * ratio), Math.round(height * ratio)];
        if (canvas.width !== pixels[0] || canvas.height !== pixels[1]) {
            canvas.width = pixels[0];
            canvas.height = pixels[1];
        }
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, height);
        if (!state) return;
        const cell = Math.min(width / cols, height / rows);
        const left = (width - cell * cols) / 2, top = (height - cell * rows) / 2;
        const x0 = center[0] - (cols - 1) / 2, y0 = center[1] - (rows - 1) / 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, cols * cell, rows * cell);
        ctx.clip();
        ctx.fillStyle = '#f8faf6';
        ctx.fillRect(left, top, cols * cell, rows * cell);
        ctx.strokeStyle = '#d6dfd5';
        ctx.beginPath();
        for (let x = Math.floor(x0); x <= Math.ceil(x0 + cols); x++) {
            const px = left + (x - x0) * cell;
            ctx.moveTo(px, top); ctx.lineTo(px, height - top);
        }
        for (let y = Math.floor(y0); y <= Math.ceil(y0 + rows); y++) {
            const py = top + (y - y0) * cell;
            ctx.moveTo(left, py); ctx.lineTo(width - left, py);
        }
        ctx.stroke();
        ctx.fillStyle = '#176057';
        ctx.fillRect(left + (state.x - x0) * cell, top + (state.y - y0) * cell, cell, cell);
        ctx.font = '600 ' + Math.min(23, cell * 0.52) + 'px ui-monospace, monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        for (let y = Math.floor(y0); y < y0 + rows; y++) {
            for (let x = Math.floor(x0); x < x0 + cols; x++) {
                const symbol = state.cells.get(x + ',' + y);
                if (!symbol) continue;
                ctx.fillStyle = x === state.x && y === state.y ? '#fff' : '#2e4035';
                ctx.fillText(symbol, left + (x - x0 + 0.5) * cell, top + (y - y0 + 0.5) * cell);
            }
        }
        ctx.restore();
    }

    function pan(now) {
        const blend = 1 - Math.exp(-(now - lastTime) / 65);
        lastTime = now;
        center = center.map((v, i) => v + (target[i] - v) * blend);
        if (Math.max(...center.map((v, i) => Math.abs(v - target[i]))) < 0.005) {
            center = [...target];
            animation = null;
        } else {
            animation = requestAnimationFrame(pan);
        }
        draw();
    }

    new ResizeObserver(draw).observe(canvas);
    return function render(next, columns, height, jump = false) {
        const reset = state !== next;
        state = next;
        cols = columns;
        rows = height;
        canvas.style.aspectRatio = cols + ' / ' + rows;
        if (!state) {
            cancelAnimationFrame(animation);
            animation = null;
            draw();
            return;
        }
        const head = [state.x, state.y];
        const follow = cameraTarget(reset ? head : target, head, cols, rows, jump);
        target = follow.center;
        if (reset || follow.cut || reducedMotion.matches) {
            cancelAnimationFrame(animation);
            animation = null;
            center = [...target];
        } else if (!animation && center.some((v, i) => v !== target[i])) {
            lastTime = performance.now();
            animation = requestAnimationFrame(pan);
        }
        draw();
    };
}
