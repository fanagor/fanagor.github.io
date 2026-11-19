// Matrices use the release's [read symbol, output row, hidden column] ordering.
export function unpackWeights(expert, run, buffer) {
    const v = expert.alphabet.length, m = expert.motions.length, h = run.hidden;
    const values = new Float32Array(buffer);
    if (values.length !== v * h * h + v * v * h + v * m * h + h)
        throw Error("Incomplete checkpoint");
    let offset = 0;
    function take(size) {
        const part = values.subarray(offset, offset + size);
        offset += size;
        return part;
    }
    return { h, A: take(v * h * h), B: take(v * v * h), C: take(v * m * h), h0: take(h), soft: run.family === 'DFST_Softmax' };
}
function normalize(vector) {
    const scale = Math.max(...vector.map(Math.abs)) || 1;
    return vector.map(value => value / scale);
}
export function createExecution(expert, input, program, weights = null) {
    const text = input.replace(/\s+/g, '').toLowerCase().replace(/[×*]/g, 'x');
    if (text.length > 4096)
        throw Error("Use at most 4,096 input characters.");
    const universal = expert.environment === 'teleporting';
    let rows;
    if (universal) {
        if (!/^[01]*$/.test(text))
            throw Error("Enter a binary word using 0 and 1.");
        rows = [...expert.programs[program], ['', ...text]];
    }
    else {
        const op = expert.operation === 'addition' ? '+' : 'x';
        const parts = text.split(op);
        if (parts.length !== 2 || parts.some(p => !/^\d+$/.test(p) || [...p].some(d => Number(d) >= expert.radix)))
            throw Error(`Enter two base-${expert.radix} numbers separated by ${op}.`);
        rows = [[...text]];
    }
    const cells = new Map(), runes = new Map();
    rows.forEach((row, y) => row.forEach((symbol, x) => {
        if (symbol === '')
            return;
        cells.set([x, y].join(','), symbol);
        if (universal && ['X', 'Y', 'Z'].includes(symbol))
            runes.set(symbol, { x, y, under: '' });
    }));
    const hidden = weights ? (weights.soft ? weights.h0.slice() : normalize(weights.h0)) : null;
    return { expert, cells, runes, x: universal ? 1 : 0, y: universal ? rows.length - 1 : 0,
        weights, hidden, state: 0, count: 0, halted: false };
}
function product(matrix, vector) {
    const result = new Float32Array(matrix.length / vector.length);
    for (let row = 0; row < result.length; row++) {
        let sum = 0;
        for (let col = 0; col < vector.length; col++)
            sum += matrix[row * vector.length + col] * vector[col];
        result[row] = sum;
    }
    if (!result.every(Number.isFinite))
        throw Error("The controller produced a non-finite value.");
    return result;
}
function argmax(scores) { return scores.indexOf(Math.max(...scores)); }
export function inspectStep(s) {
    if (s.halted)
        return null;
    const e = s.expert, read = s.cells.get([s.x, s.y].join(',')) ?? '';
    const token = e.alphabet.indexOf(read);
    let next, writeID, motionID, hidden, matrices;
    const w = s.weights;
    if (w) {
        const slice = (bank, rows) => bank.subarray(token * rows * w.h, (token + 1) * rows * w.h);
        const A = slice(w.A, w.h), B = slice(w.B, e.alphabet.length), C = slice(w.C, e.motions.length);
        matrices = { A, B, C };
        writeID = argmax(product(B, s.hidden));
        motionID = argmax(product(C, s.hidden));
        hidden = product(A, s.hidden);
        if (!w.soft)
            hidden = normalize(hidden);
    }
    else {
        [next, writeID, motionID] = e.transitions[s.state][token];
    }
    return { read, write: e.alphabet[writeID], motion: e.motions[motionID], next, hidden, matrices,
        halt: w ? e.motions[motionID] === 'S' : next === e.halt };
}
// Screen coordinates increase downward for both grid conventions.
export function applyStep(s, action) {
    const pos = [s.x, s.y].join(','), value = action.write;
    if (s.expert.environment === 'teleporting' && ['X', 'Y', 'Z'].includes(value)) {
        const old = s.runes.get(value);
        if (old) {
            const key = [old.x, old.y].join(',');
            if (old.under)
                s.cells.set(key, old.under);
            else
                s.cells.delete(key);
            s.runes.delete(value);
        }
        const under = s.cells.get(pos) ?? '';
        s.runes.delete(under);
        s.runes.set(value, { x: s.x, y: s.y, under });
        s.cells.set(pos, value);
    }
    else {
        s.runes.delete(s.cells.get(pos));
        if (value)
            s.cells.set(pos, value);
        else
            s.cells.delete(pos);
    }
    const jump = s.runes.get(action.motion);
    if (jump) {
        s.x = jump.x;
        s.y = jump.y;
    }
    else {
        if (action.motion === 'R')
            s.x++;
        if (action.motion === 'L')
            s.x--;
        if (action.motion === 'D')
            s.y++;
        if (action.motion === 'U')
            s.y--;
    }
    if (s.weights)
        s.hidden = action.hidden;
    else
        s.state = action.next;
    s.halted = action.halt;
    s.count++;
}
