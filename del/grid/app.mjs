import { createExecution, inspectStep, applyStep, unpackWeights } from './engine.mjs';
const $ = id => document.getElementById(id);
const names = { add2: 'Binary addition', mult2: 'Binary multiplication', add10: 'Decimal addition', mult10: 'Decimal multiplication', universal: 'Universal simulation' };
const families = { Expert: 'Expert', DFST: 'DFST', DFST_Softmax: 'Softmax DFST' };
let catalog, execution, frame, timer, generation = 0, busy = true, loadedInput, loadedProgram;
const glyph = v => v === '' ? 'λ' : v;
function options(select, pairs) {
    select.replaceChildren(...pairs.map(([value, label]) => new Option(label, value)));
}
function updateChoices(taskChanged) {
    const task = $('task').value, runs = catalog.runs.filter(r => r.task === task);
    if (taskChanged) {
        const old = $('family').value;
        options($('family'), ['Expert', ...new Set(runs.map(r => r.family))].map(k => [k, families[k]]));
        if ([...$('family').options].some(o => o.value === old))
            $('family').value = old;
        const inputs = { add2: '101+11', mult2: '101x11', add10: '297+84', mult10: '23x14', universal: '101' };
        $('input').value = inputs[task];
        const programs = Object.keys(catalog.experts[task].programs ?? {});
        options($('program'), programs.map(k => [k, k]));
        if (programs.includes('parity'))
            $('program').value = 'parity';
        $('programLabel').hidden = !programs.length;
    }
    const family = $('family').value;
    const selected = runs.filter(r => r.family === family);
    options($('run'), selected.map(r => [r.source, r.id]));
    const examples = { add2: 'warmup_50000_steps_250000', mult2: 'warmup_25000_steps_500000', add10: 'warmup_50000_steps_4000000', mult10: 'warmup_0_steps_4000000', universal: 'data_75_steps_500000' };
    const preferred = selected.find(r => r.id === examples[task]);
    if (preferred)
        $('run').value = preferred.source;
    $('runLabel').hidden = family === 'Expert';
}
async function get(path, type) {
    const response = await fetch(path);
    if (!response.ok)
        throw Error(`Could not load ${path} (HTTP ${response.status}).`);
    return response[type]();
}
function pause() { clearInterval(timer); timer = null; $('play').textContent = '▶ Play'; }
function controls() {
    const stopped = busy || !execution || execution.halted || !frame || execution.count >= 100000;
    $('play').disabled = stopped;
    $('step').disabled = stopped;
    $('reset').disabled = busy || !execution;
}
async function load() {
    const request = ++generation;
    pause();
    busy = true;
    execution = null;
    frame = null;
    controls();
    $('grid').replaceChildren();
    $('detail').replaceChildren();
    $('counter').value = 'Step 0';
    $('position').textContent = '';
    $('status').textContent = 'Loading controller…';
    const task = $('task').value, e = catalog.experts[task], run = catalog.runs.find(r => r.source === $('run').value);
    try {
        const weights = run ? unpackWeights(e, run, await get(run.path, 'arrayBuffer')) : null;
        if (request !== generation)
            return;
        loadedInput = $('input').value;
        loadedProgram = $('program').value;
        const table = catalog.programs?.[run?.programs?.[loadedProgram]];
        const expert = table ? { ...e, programs: { ...e.programs, [loadedProgram]: table } } : e;
        execution = createExecution(expert, loadedInput, loadedProgram, weights);
        $('inspectTitle').textContent = weights ? 'Neural controller' : 'Expert transition';
        $('source').href = 'https://github.com/fanagor/DEL/tree/main/' + (run ? run.source : 'src/differentiable_exact_learning/data/transitions');
        $('source').textContent = run ? 'Run and configuration ↗' : 'Expert rules ↗';
        refresh();
    }
    catch (err) {
        if (request === generation)
            $('status').textContent = err.message;
    }
    finally {
        if (request === generation) {
            busy = false;
            controls();
        }
    }
}
function renderGrid(s) {
    const cols = window.innerWidth < 720 ? 11 : 21, rows = 7, cells = [];
    const left = s.x - Math.floor(cols / 3), top = s.y - Math.floor(rows / 2);
    for (let y = top; y < top + rows; y++)
        for (let x = left; x < left + cols; x++) {
            const elem = document.createElement('span'), symbol = s.cells.get([x, y].join(',')) || '';
            elem.className = 'cell' + (s.x === x && s.y === y ? ' active' : '');
            elem.textContent = symbol || ((s.x === x && s.y === y) ? 'λ' : '');
            elem.title = `(${x}, ${y}) · ${glyph(symbol)}`;
            cells.push(elem);
        }
    $('grid').style.gridTemplateColumns = `repeat(${cols},1fr)`;
    $('grid').replaceChildren(...cells);
    $('position').textContent = `Head (${s.x}, ${s.y})`;
    $('grid').setAttribute('aria-label', `Grid at step ${s.count}, head at ${s.x}, ${s.y}, reading ${glyph(s.cells.get([s.x, s.y].join(',')) || '')}`);
}
function element(tag, cls, content) {
    const el = document.createElement(tag);
    el.className = cls;
    el.textContent = content;
    return el;
}
function heatmap(label, values, cols, soft, rowsTitle) {
    const fig = document.createElement('figure'), canvas = document.createElement('canvas');
    const rows = values.length / cols;
    canvas.width = cols;
    canvas.height = rows;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${label}, ${rows} rows by ${cols} columns`);
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(cols, rows);
    const max = soft ? 1 : values.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
    values.forEach((v, i) => {
        const t = Math.min(1, Math.abs(v) / max), ink = v < 0 ? [169, 68, 39] : [17, 98, 94];
        ink.forEach((c, k) => image.data[4 * i + k] = 249 + (c - 249) * t);
        image.data[4 * i + 3] = 255;
    });
    ctx.putImageData(image, 0, 0);
    const scale = element('p', 'scale', soft ? '0 to 1' : `−${max.toPrecision(2)} to +${max.toPrecision(2)}`);
    const note = element('p', 'scale', rowsTitle);
    canvas.onpointermove = ev => {
        const box = canvas.getBoundingClientRect(), c = Math.min(cols - 1, Math.floor((ev.clientX - box.left) * cols / box.width)), r = Math.min(rows - 1, Math.floor((ev.clientY - box.top) * rows / box.height));
        note.textContent = `[${r}, ${c}] = ${values[r * cols + c].toPrecision(5)}`;
    };
    canvas.onpointerleave = () => note.textContent = rowsTitle;
    fig.append(element('figcaption', '', label), canvas, scale, note);
    return fig;
}
function inspect(s, a) {
    const details = $('detail');
    details.replaceChildren();
    if (!a) {
        details.append(element('p', 'info', s.weights ? 'Final hidden state' : 'Final expert state q' + s.state));
        if (s.weights)
            details.append(heatmap('h', s.hidden, s.weights.h, s.weights.soft, 'Hidden coordinate →'));
        return;
    }
    const action = `read ${glyph(a.read)} · write ${glyph(a.write)} · move ${a.motion}`;
    if (!s.weights) {
        const trans = element('div', 'transition', '');
        trans.append(element('span', 'bubble', 'q' + s.state), element('span', 'edge', `${glyph(a.read)} / ${glyph(a.write)}, ${a.motion}`), element('span', 'bubble', 'q' + a.next));
        details.append(trans, element('p', 'caption', action));
        return;
    }
    const w = s.weights;
    const intro = action + '. ' + (w.soft ? 'Heatmaps show probabilities after softmax.' : 'The hidden state uses the local viewer’s max-absolute-value normalization.');
    const maps = element('div', 'maps', '');
    maps.append(heatmap('h', s.hidden, w.h, w.soft, 'Hidden coordinate →'), heatmap('A[x] · next state', a.matrices.A, w.h, w.soft, 'Rows: next state'), heatmap('B[x] · write', a.matrices.B, w.h, w.soft, 'Rows: ' + s.expert.alphabet.map(glyph).join(' ')), heatmap('C[x] · move', a.matrices.C, w.h, w.soft, 'Rows: ' + s.expert.motions.join(' ')));
    details.append(element('p', 'info', intro + ' Matrix columns index the current hidden coordinate.'), maps);
}
function refresh() {
    const s = execution;
    renderGrid(s);
    $('counter').value = 'Step ' + s.count.toLocaleString();
    frame = inspectStep(s);
    inspect(s, frame);
    $('status').textContent = s.halted ? 'Halted.' : s.count >= 100000 ? 'Stopped at the 100,000-step playback limit.' : `${names[$('task').value]} · ${families[$('family').value]} · ${loadedInput || 'empty word'}`;
    if (s.halted || s.count >= 100000)
        pause();
    controls();
}
function step() {
    if (!frame || execution.halted)
        return;
    try {
        applyStep(execution, frame);
        refresh();
    }
    catch (err) {
        pause();
        frame = null;
        $('detail').replaceChildren();
        $('status').textContent = err.message;
        controls();
    }
}
function play() { if (timer) {
    pause();
    return;
} timer = setInterval(step, Number($('speed').value)); $('play').textContent = 'Ⅱ Pause'; }
$('play').onclick = play;
$('step').onclick = () => { pause(); step(); };
$('reset').onclick = () => { pause(); const s = execution; $('input').value = loadedInput; execution = createExecution(s.expert, loadedInput, loadedProgram, s.weights); refresh(); };
$('speed').onchange = () => { if (timer) {
    pause();
    play();
} };
$('settings').onsubmit = e => { e.preventDefault(); if (catalog)
    load(); };
$('task').onchange = () => { updateChoices(true); load(); };
$('family').onchange = () => { updateChoices(false); load(); };
$('program').onchange = $('run').onchange = load;
window.addEventListener('resize', () => { if (execution)
    renderGrid(execution); });
try {
    catalog = await get('data/catalog.json', 'json');
    options($('task'), Object.keys(names).filter(k => catalog.experts[k]).map(k => [k, names[k]]));
    updateChoices(true);
    await load();
}
catch (err) {
    $('status').textContent = err.message;
}
