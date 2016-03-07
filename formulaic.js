var sampleRate = 8000;
var nSamples = sampleRate * 32;
function setup() {
    var audioCtx = new AudioContext();
    var buffer = audioCtx.createBuffer(1, nSamples, sampleRate);
    var canvas = document.getElementById('canvas');
    var canvasCtx = canvas.getContext('2d');

    var closeFn = null;
    document.getElementById('formula').onkeypress = function (e) {
        var key = e.keyCode || e.which;
        if (key !== 13) // enter key
            return
        if (closeFn) closeFn();
        closeFn = play(this.value, audioCtx, canvasCtx, canvas.width, canvas.height);
    }
    document.getElementById('stop').onclick = function () {
        if (closeFn) closeFn();
        _currFn = null;
    }
}

_currFn = null;
function play (song, aCtx, cCtx, cWidth, cHeight) {
    var songFn = new Function('t', 'return ' + song);
    _currFn = songFn;
    var buffer = aCtx.createBuffer(1, nSamples, sampleRate);
    var data = buffer.getChannelData(0);

    for (var t=0; t<nSamples; t++) {
        data[t] = songFn(t);
        data[t] = (data[t] % 256) / 256; // reduce to 8 bit resolution in [0, 1]
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
        rasterPaintSignal(cCtx, cWidth, cHeight, data, offset);
        window.requestAnimationFrame(animationCallback);
    }
    animationCallback(0);

    var source = aCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(aCtx.destination);
    source.start();
    return function () {
        source.stop();
    }
}

// paint canvas with lines
function rasterPaintSignal (cCtx, cWidth, cHeight, sigData, offset) {
    cCtx.clearRect(0, 0, cWidth, cHeight);
    for (var x=0; x<cWidth-1; x++) {
        cCtx.beginPath();
        var y1 = Math.floor((sigData[x + offset]) * 255);
        var y2 = Math.floor((sigData[x + offset + 1]) * 255);
        cCtx.moveTo(x, y1);
        cCtx.lineTo(x+1, y2);
        cCtx.stroke();
    }
}

// paint canvas px by px
function paintSignal (cCtx, cWidth, cHeight, sigData, offset) {
    var imgData = cCtx.createImageData(cWidth, cHeight);
    for (var x=0; x<cWidth; x++) {
        var normedVal = Math.floor((sigData[x + offset] / 2 + 0.5) * 255);
        var i = (x + (cHeight - normedVal) * cWidth) * 4;
        imgData.data[i] = 255;
        imgData.data[i+1] = 0;
        imgData.data[i+2] = 0;
        imgData.data[i+3] = 255;
    }
    cCtx.putImageData(imgData, 0, 0);
}

window.onload = setup;
