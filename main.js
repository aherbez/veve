const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const menu = require('./src/menu.js');
const { NEW_DOCUMENT_NEEDED,
    WRITE_NEW_FILE_NEEDED,
    NEW_FILE_WRITTEN,
    SAVED,
    SAVE_NEEDED
} = require('./actions/types');

require('electron-reload')(__dirname);

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    })

    win.loadFile('index.html');
    win.setTitle('Veve 0.0.1');

    Menu.setApplicationMenu(menu(win));

    // win.webContents.openDevTools();

    ipcMain.on(WRITE_NEW_FILE_NEEDED, (event, {dir}) => {
        fs.writeFile(dir, `Start edditing ${dir}`, (err) => {
            if (err) { return console.log('error in writing new file')}
            win.webContents.send(NEW_FILE_WRITTEN, `Start editing ${dir}`)
        })
    })
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platorm !== 'darwin') {
        app.quit();
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
})

app.on('close', () => {
    win = null;
})