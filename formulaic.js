var sampleRate = 8000;
var nSamples = sampleRate * 256;
var formulas = {
    'gates': '((t >> 10) & 42) * t',
    'busy': '(t >> 4 & t * 20) | (t >> 3 & t / 1024) | (t >> 12 & t * 40)',
    'sawtooth': '(Math.abs(t/4 % 4 - 2) - 1) * 100',
    'sinusoid': 'Math.sin(t/3) * 100',
    'square': 'Math.sin(t/3) < 0 ? -100 : 100',
}
var defaultFormula = 'busy';

function setup() {
    var canvas = document.getElementById('canvas');
    var input = document.getElementById('formula');
    var select = document.getElementById('select');
    var stop = document.getElementById('stop');
    var start = document.getElementById('start');
    var statusSpan = document.getElementById('status');

    var audioCtx = new AudioContext();
    var buffer = audioCtx.createBuffer(1, nSamples, sampleRate);
    var canvasCtx = canvas.getContext('2d');

    var closeFn = null;
    input.onkeyup = function (e) {
        if (!test(this.value, statusSpan)) return;
        if (closeFn) closeFn();
        closeFn = play(input.value, audioCtx, canvasCtx, canvas.width, canvas.height);
    }
    start.onclick = function () {
        if (!test(input.value, statusSpan)) return;
        if (closeFn) closeFn();
        closeFn = play(input.value, audioCtx, canvasCtx, canvas.width, canvas.height);
    }
    stop.onclick = function () {
        if (closeFn) closeFn();
        _currFn = null;
    }
    select.onchange = function (e) {
        var f = formulas[select.value];
        input.value = f;
        if (closeFn) closeFn();
        closeFn = play(f, audioCtx, canvasCtx, canvas.width, canvas.height);
    }
    for (var name in formulas) {
        var option = document.createElement('option');
        option.value = name;
        option.text = name;
        select.add(option);
    }
    select.value = defaultFormula;
    input.value = formulas[defaultFormula];
}

function test (song, statusSpan) {
    try {
        var songFn = toFn(song);
        var isNumber = (typeof songFn(0) === 'number') && !isNaN(songFn(0));
        if (isNumber) {
            statusSpan.className = statusSpan.textContent = 'success';
        } else {
            statusSpan.className = 'fail';
            statusSpan.textContent = 'function not numeric';
        }
        return isNumber;
    } catch (e) {
        console.log(e);
        statusSpan.className = 'fail';
        statusSpan.textContent = e;
        return false;
    }
}

function toFn (song) {
    return new Function('t', 'var ret = ' + song + '; return ret;');
}

_currFn = null;
function play (song, audioCtx, canvasCtx) {
    canvasCtx.canvas.width = window.innerWidth;
    canvasCtx.canvas.height = window.innerHeight;
    var songFn = toFn(song);
    _currFn = songFn;
    var buffer = audioCtx.createBuffer(1, nSamples, sampleRate);
    var data = buffer.getChannelData(0);

    for (var t=0; t<nSamples; t++) {
        data[t] = songFn(t); // get sample
        data[t] = ((data[t] % 255) / 255); // reduce to 8 bit resolution in [-1, 1]
    }

    var start = null;
    function animationCallback (timestamp) {
        if (_currFn !== songFn) return;
        if (!start) start = timestamp;
        var dt = timestamp - start;
        var offset = Math.floor((dt / 1000) * sampleRate);
        if (offset > nSamples) {
            offset = 0;
            start = 0;
        }
        rasterOscilloscope(canvasCtx, data, offset);
        window.requestAnimationFrame(animationCallback);
    }
    animationCallback(0);

    var source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(audioCtx.destination);
    source.start();
    return function () {
        source.stop();
    }
}

function rasterOscilloscope (canvasCtx, sigData, offset) {
    var cWidth = canvasCtx.canvas.width;
    var cHeight = canvasCtx.canvas.height;
    halfHeight = Math.floor(cHeight/2);

    canvasCtx.clearRect(0, 0, cWidth, cHeight);

    // draw origin
    canvasCtx.strokeStyle = '#eeeeee';
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, halfHeight);
    canvasCtx.lineTo(cWidth, halfHeight);
    canvasCtx.stroke();

    // draw signal
    canvasCtx.strokeStyle = '#FF0000';
    for (var x=0; x<cWidth-1; x++) {
        canvasCtx.beginPath();
        var y1 = Math.floor((1 - sigData[x + offset]) * halfHeight);
        var y2 = Math.floor((1 - sigData[x + offset + 1]) * halfHeight);
        canvasCtx.moveTo(x, y1);
        canvasCtx.lineTo(x+1, y2);
        canvasCtx.stroke();
    }
}

window.onload = setup;
