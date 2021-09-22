const fs = require('fs')
const path = require('path')
const { ipcRenderer, remote, app } = require('electron');
const { dialog } = require('electron').remote;
const { NEW_DOCUMENT,
    SAVED,
    SAVE_NEEDED,
    OPENFILE,
    REQUEST_SAVE
} = require(path.resolve('actions/types.js'));
const GIFEncoder = require('gif-encoder-2');

let canvas, previewCtx = null;
let encoder = null;
let recording = false;
let offscreenCanvas, ctx = null;

let editor = null;
let filePath = null;
let prevContent = '';

let currentTime = 0;
let lastTime;
let u = 0;
let time = 0;
let timeSeconds = 0;
let playing = false;

let loop = true;
let fps = 30;

let contentDirty = false;

let duration = 5;
let stage = {
    width: 1200,
    height: 675
}

let renderBackground = false;
let backgroundColor = null;

let userRenderFunctionStr = '';

function updateTitleText() {
    let newTitle = (filePath) ? filePath : "Veve 0.0.2"
    if (contentDirty) {
        newTitle += "*";
    }
    document.title = newTitle;
}

ipcRenderer.on(OPENFILE, (event, fileLocation) => {
    openFileFromPath(fileLocation);
})

function openFileFromPath(fileLocation) {
    fs.readFile(fileLocation, "utf8", (err, data) => {
        if (err) throw err;
        filePath = fileLocation;
        updateRecentFile(fileLocation);

        let parsedData = JSON.parse(data);
        let code = parsedData.code || "";
        duration = parsedData.duration || 5;
        stage.width = parsedData.stageWidth || 1200;
        stage.height = parsedData.stageHeight || 675;
        renderBackground = parsedData.renderBack || false;
        backgroundColor = parsedData.backgroundColor || null;

        initUI();
        resetCanvasSize();

        editor.session.setValue(code);
        prevContent = code.trim();
        
        resetTime();
        updateRenderFunction();
        updateTitleText();

        ipcRenderer.send(SAVE_NEEDED, {
            content: editor.getValue(),
            filePath: filePath
        })
    });
}

ipcRenderer.on(NEW_DOCUMENT, (event, data) => {

    contentDirty = true;
    filePath = null;
    prevContent = '';
    editor.session.setValue('');
    resetTime();

    updateRenderFunction();
    updateTitleText();
})

ipcRenderer.on(REQUEST_SAVE, (event, targetPath) => {
    let code = editor.session.getValue();
    let saveData = {
        code: code,
        duration: duration,
        stageWidth: stage.width,
        stageHeight: stage.height,
        backgroundColor: backgroundColor,
        renderBack: renderBackground
    }
     
    fs.writeFile(targetPath, JSON.stringify(saveData, null, 4), (err) => {
        if (err) throw err;
        filePath = targetPath;
        onSave();
    });
})

function onSave() {
    prevContent = editor.session.getValue().trim();
    contentDirty = false;
    
    updateRecentFile();
    updateRenderFunction();
    updateTitleText();
}

let updateRenderFunction = function() {
    userRenderFunctionStr = editor.session.getValue();
}

function updateRecentFile() {
    let userPath = remote.app.getPath('userData');
    let fullPath = path.join(userPath, 'settings.json');

    let settings = {
        lastFile: filePath
    }

    let data = JSON.stringify(settings);
    fs.writeFileSync(fullPath, data);
}

// try loading the most recently-saved file
function maybeLoadLastFile() {
    let userPath = remote.app.getPath('userData');
    let fullPath = path.join(userPath, 'settings.json');

    fs.readFile(fullPath, (err, data) => {
        let settings = JSON.parse(data);

        let lastFile = settings.lastFile;
        if (lastFile) {
            openFileFromPath(lastFile);
        }
    })
}

function initCodeEditor() {
    editor = ace.edit("code");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/javascript");
}

function initCanvas() {
    canvas = document.getElementById("stage");
    previewCtx = canvas.getContext('2d');

    offscreenCanvas = document.createElement('canvas');
    ctx = offscreenCanvas.getContext('2d');

    offscreenCanvas.style.position = 'absolute';    
}

function init() {
    initCodeEditor();
    initCanvas();

    maybeLoadLastFile();

    encoder = new Whammy.Video(30);

    lastTime = Date.now();

    update();
    initUI();

    document.getElementById('code').onkeyup = (e) => {
        
        if (editor.getValue().trim() != prevContent) {
            contentDirty = true;
            updateTitleText();    
        }

        ipcRenderer.send(SAVE_NEEDED, {
            content: editor.getValue(),
            filePath: filePath
        })
    }
}

function startCap() {
    console.log('starting capture');
    recording = true;
}

function stopCap() {
    console.log('stopping capture');

    if (recording) {
        setTimeout(finializeVideo, 100);
    }

    recording = false;
}

function exportVideo() {
    time = 0;
    recording = true;
    playing = true;
}


function exportFrame() {
    let filePath = dialog.showSaveDialogSync({
        title: "Save Image Sequence",
        createDirectory: true
    });
    if (!filePath) return;
    
    let data = offscreenCanvas.toDataURL();
    data = data.split('base64,')[1];
    let buf = Buffer.from(data, 'base64');
    fs.writeFile(filePath, buf, (err) => {
        if (err) throw err;
        console.log(`wrote frame ${filePath}`);
    });
}

function debugGif(filePath) {
    const size = 200
    const half = size / 2
     
    // const canvas = createCanvas(size, size)
    // const ctx = canvas.getContext('2d')
     
    function drawBackground() {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
    }
     
    const encoder = new GIFEncoder(size, size)
    encoder.setDelay(500)
    encoder.start()
     
    drawBackground()
    ctx.fillStyle = '#ff0000'
    ctx.fillRect(0, 0, half, half)
    encoder.addFrame(ctx)
     
    drawBackground()
    ctx.fillStyle = '#00ff00'
    ctx.fillRect(half, 0, half, half)
    encoder.addFrame(ctx)
     
    drawBackground()
    ctx.fillStyle = '#0000ff'
    ctx.fillRect(half, half, half, half)
    encoder.addFrame(ctx)
     
    drawBackground()
    ctx.fillStyle = '#ffff00'
    ctx.fillRect(0, half, half, half)
    encoder.addFrame(ctx)
     
    encoder.finish()
     
    const buffer = encoder.out.getData()
     
    fs.writeFile(filePath, buffer, error => {
      // gif drawn or error
      console.log(`error: ${error}`);
    })
}

function exportGIF() {
    let filePath = dialog.showSaveDialogSync({
        title: "Save GIF",
        createDirectory: true
    });
    if (!filePath) return;
    document.getElementById('settings-output').value = 'Writing GIF...';
    
    let totalFrames = duration * fps;
    resetTime();

    const encoder = new GIFEncoder(stage.width, stage.height, 'octree', false, totalFrames);
    encoder.setFrameRate(fps);

    if (loop) {
        encoder.setRepeat(0);
    } else {
        encoder.setRepeat(1);
    }

    encoder.start();

    encoder.on('progress', percent => {
        console.log(`${percent}% done...`);
        document.getElementById('settings-output').value = `Writing GIF: ${percent}% done`;
    });

    for (let i=0; i < (totalFrames + 1); i++) {
        render();
        encoder.addFrame(ctx);
        copyCanvas();

        timeSeconds += 1 / fps;
        time = timeSeconds / duration;
    }

    encoder.finish();

    const buffer = encoder.out.getData();

    fs.writeFile(filePath, buffer, error  => {
        if (!error) {
            document.getElementById('settings-output').value = `DONE!`;
        }
    });

}

async function exportSequence() {
    let filePath = dialog.showSaveDialogSync({
        title: "Save Image Sequence",
        createDirectory: true
    });
    if (!filePath) return;

    let dir = path.dirname(filePath);
    let basename = path.basename(filePath);
    basename = basename.split('.')[0];

    // calc num frames
    let totalFrames = duration * fps;

    resetTime();

    for (let i=0; i < (totalFrames + 1); i++) {
        render();
        
        // save PNG image to file
        let filename = `${basename}_${String(i).padStart(3, '0')}.png`;
        let fullPath = path.join(dir, filename);

        let data = offscreenCanvas.toDataURL();
        data = data.split('base64,')[1];
        let buf = Buffer.from(data, 'base64');
        await fs.writeFile(fullPath, buf, (err) => {
            if (err) throw err;
            console.log(`wrote frame ${i}`);
        });

        timeSeconds += 1 / fps;
        time = timeSeconds / duration;
    }
}

function setDuration() {
    duration = parseFloat(document.getElementById("settings-duration").value);
    resetTime();
}

function setFPS() {
    fps = parseInt(document.getElementById("settings-fps").value);
    resetTime();    
}

function setBackgroundColor() {
    backgroundColor = document.getElementById('settings-background-color').value;
}

function setUseBackground() {
    renderBackground = document.getElementById('settings-use-background').checked;
}

function setDimensions() {
    let newWidth = parseFloat(document.getElementById('set-dim-width').value);
    let newHeight = parseFloat(document.getElementById('set-dim-height').value);

    if (isNaN(newWidth) || isNaN(newHeight)) {
        console.error('bad input');
        initUI();
        return;
    }

    stage.width = newWidth;
    stage.height = newHeight;

    resetCanvasSize();
}

function resetCanvasSize() {
    offscreenCanvas.width = stage.width;
    offscreenCanvas.height = stage.height;
    offscreenCanvas.style.left = `-${stage.width * 2}px`;

    let aspectRatio = stage.width / stage.height;

    let scaleX = 608/stage.width;
    let scaleY = 342/stage.height;
    let scale = Math.min(scaleX, scaleY);

    canvas.width = stage.width * scale;
    canvas.height = stage.height * scale;
    canvas.style.marginLeft = `-${canvas.width/2}px`;

}

function gotoStart() {
    resetTime();
    setPlaying(false);
}

// TODO: implement
function prevKey() {}
function nextKey() {}

function setPlaying(play) {
    playing = play;
    
    let playBtn = document.getElementById("btn-play-icon");
    let newClass = playing ? "fa-pause" : "fa-play";
    
    playBtn.classList.remove("fa-play");
    playBtn.classList.remove("fa-pause");
    playBtn.classList.add(newClass);

}

function togglePlayback() {
    setPlaying(!playing);
}

function initUI() {
    document.getElementById('set-dim-width').value = stage.width;
    document.getElementById('set-dim-height').value = stage.height;
    document.getElementById('settings-duration').value = duration;
    document.getElementById('settings-background-color').value = backgroundColor;
    document.getElementById('settings-use-background').checked = renderBackground;
}

function toggleLooping() {
    loop = !loop;

    let loopBtn = document.getElementById("btn-loop-icon"); // .innerHTML = (loop) ? "Looping" : "No Loop";
    let newClass = loop ? "fa-loop" : "fa-stop-circle";

    loopBtn.classList.remove("fa-loop");
    loopBtn.classList.remove("fa-stop-circle");
    loopBtn.classList.add(newClass);

}

function finalizeVideoExample(){
	var start_time = new Date;
	var output = video.compile();
	var end_time = +new Date;
	var url = webkitURL.createObjectURL(output);

	document.getElementById('download').style.display = '';
	document.getElementById('download').href = url;
	document.getElementById('status').innerHTML = "Compiled Video in " + (end_time - start_time) + "ms, file size: " + Math.ceil(output.size / 1024) + "KB";

}

function finializeVideo() {
    encoder.compile(false, (output) => {
        let url = (window.webkitURL || window.URL).createObjectURL(output);
        console.log(url);
        document.getElementById("downloadLink").href = url;
    })
}

function resetTime() {
    time = 0;
    timeSeconds = 0;
}

function update() {
    let nowTime = Date.now();
    let dt = nowTime - lastTime;
    lastTime = nowTime;

    if (playing) {
        if (recording) {
            encoder.add(ctx);
        }
    
        timeSeconds += dt / 1000;
        if (timeSeconds > duration) {
            if (recording) {
                recording = false;
                setPlaying(false);
                setTimeout(finializeVideo, 100);
            }
            
            resetTime();

            if (!loop) {
                setPlaying(false);
            }
        }
        
        time = timeSeconds / duration;
    }
    drawBackground(ctx, stage.width, stage.height);

    render();

    copyCanvas();

    requestAnimationFrame(update);
}

function drawBackground(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#FFF";
    ctx.rect(0, 0, w, h);
    ctx.fill();
}

function copyCanvas() {
    let scaleFac = canvas.width / offscreenCanvas.width;
    drawBackground(previewCtx, 608, 348);
    previewCtx.save();
    previewCtx.scale(scaleFac, scaleFac);     
    previewCtx.drawImage(offscreenCanvas, 0, 0);
    previewCtx.restore();
}


function render(dt) {
    ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    if (renderBackground && backgroundColor !== null) {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        ctx.restore();
    }


    ctx.save();
    ctx.translate(offscreenCanvas.width/2, offscreenCanvas.height/2);

    if (userRenderFunctionStr != '')
    {
        try {
            eval(userRenderFunctionStr);
        }
        catch (e) {
            console.error(e);
        }
    }

    ctx.restore();
}

// UI FUNCTIONS ------------------------------------

function toggleSection(sectionId) {
    let settingsMain = document.getElementById(`ctrl-cont-${sectionId}`);
    let settingsIcon = document.getElementById(`ctrl-head-icon-${sectionId}`);

    console.log(settingsMain.style.display);
    let isShowing = settingsMain.style.display != 'none';

    if (isShowing) {
        settingsMain.style.display = 'none';
        settingsIcon.classList.remove('fa-chevron-down');
        settingsIcon.classList.add('fa-chevron-right');
    } else {
        settingsMain.style.display = 'block';
        settingsIcon.classList.remove('fa-chevron-right');
        settingsIcon.classList.add('fa-chevron-down');
    }

}

init();