const fs = require('fs')
const path = require('path')
const { ipcRenderer, remote } = require('electron');
const { dialog } = require('electron').remote;
const { readTitles } = require(path.resolve('actions/uiActions'));
const { NEW_DOCUMENT_NEEDED,
    WRITE_NEW_FILE_NEEDED,
    NEW_FILE_WRITTEN,
    SAVED,
    SAVE_NEEDED,
    SAVEFILE
} = require(path.resolve('actions/types.js'));

let canvas, previewCtx = null;
let encoder = null;
let recording = false;
let offscreenCanvas, ctx = null;

let editor = null;
let filePath = null;

let durationInSeconds = 5;
let currentTime = 0;
let lastTime;
let u = 0;
let time = 0;
let timeSeconds = 0;
let playing = false;
let duration = 5;
let loop = true;
let fps = 30;

let stage = {
    width: 1200,
    height: 675
}

let userRenderFunctionStr = '';


function readFileContentOnClick(dir, el) {
    el.addEventListener('click', (e) => {
        console.log("reading file");
        fs.readFile(dir, "utf8", (err, data) => {
            if (err) throw err;
            fileDir = dir;
            editor.session.setValue(data);
            updateRenderFunction();
        })
    })
}

function handleNewFile(form, dir, content) {
    let fileName = form.target[0].value;
    form.target.classList.remove('show');
    
    let elChild = document.createElement('li');
    elChild.innerText = fileName;
    readFileContentOnClick(dir, elChild);
    form.target[0].value = '';
    form.target.parentNode.insertBefore(elChild, form.target.nextSibling);

    editor.session.setValue(content);   
}

ipcRenderer.on(NEW_DOCUMENT_NEEDED, (event, data) => {

    let form = document.getElementById('form');
    form.classList.toggle('show');
    document.getElementById('title_input').focus();
    form.addEventListener('submit', function(e) {
        e.preventDefault();

        let fileName = e.target[0].value;
        // write file here
        ipcRenderer.send(WRITE_NEW_FILE_NEEDED, {
            dir: `./data/${fileName}.js`
        })

        ipcRenderer.on(NEW_FILE_WRITTEN, function(event, message) {
            let path = `./data/${fileName}.js`;
            
            handleNewFile(e, path, message);
            setCurrentFile(path);
        })
    })

})

ipcRenderer.on(SAVED, (event, data) => {
    
    /*
    el = document.createElement("p");
    text = document.createTextNode(data);
    el.appendChild(text);
    el.setAttribute("id", "flash");
    document.querySelector('body').prepend(el);
    setTimeout(function() {
        document.querySelector('body').removeChild(el);
    }, 10000);
    */

    // TODO: also sloppy, refactor
    // document.title = document.title.slice(0, -1);
    
    updateRenderFunction();
    
});

let updateRenderFunction = function() {
    userRenderFunctionStr = editor.session.getValue();
}

function initCodeEditor() {
    editor = ace.edit("code");
    editor.setTheme("ace/theme/monokai");
    editor.session.setMode("ace/mode/javascript");
}

function setCurrentFile(path) {
    filePath = path;
}

function initCanvas() {
    canvas = document.getElementById("stage");
    previewCtx = canvas.getContext('2d');

    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = stage.width;
    offscreenCanvas.height = stage.height;
    offscreenCanvas.style.position = 'absolute';
    offscreenCanvas.style.left = `-${stage.width * 2}px`;
    
    ctx = offscreenCanvas.getContext('2d');

}

function init() {
    initCodeEditor();
    initCanvas();

    encoder = new Whammy.Video(30);

    lastTime = Date.now();

    update();

    readTitles('./data').map(({title, dir}) => {
        el = document.createElement('li');
        text = document.createTextNode(`${title.split('.js')[0]}`);
        el.appendChild(text);
        el.addEventListener('click', (e) => {
            fs.readFile(dir, "utf8", (err, data) => {
                if (err) throw err;
                setCurrentFile(dir);
                editor.session.setValue(data);
                updateRenderFunction();
            })
        })

        document.getElementById('files').appendChild(el);
    })

    document.getElementById('code').onkeyup = (e) => {
        if (!document.title.endsWith("*")) {
            document.title += "*";
        }

        console.log('sending SAVE_NEEDED', filePath);
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

async function exportSequence() {
    // create save file dialog
    // ipcRenderer.send(SAVEFILE);
    let filePath = dialog.showSaveDialogSync({
        title: "Save Image Sequence",
        createDirectory: true
    });
    if (!filePath) return;

    let dir = path.dirname(filePath);
    let basename = path.basename(filePath);
    basename = basename.split('.')[0];

    console.log(filePath, dir, basename);

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

// when we get a file location from main
function onSaveSelection() {

}

function setDuration() {
    duration = parseFloat(document.getElementById("settings-duration").value);
    resetTime();
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
    document.getElementById("btn-play").innerHTML = (playing ? "||" : "&gt;")
}

function togglePlayback() {
    setPlaying(!playing);
}

function toggleLooping() {
    loop = !loop;

    document.getElementById("btn-loop").innerHTML = (loop) ? "Looping" : "No Loop";
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

    // drawBackground(ctx, stage.width, stage.height);
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

init();