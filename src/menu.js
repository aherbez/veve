const { app, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path')
const { 
    NEW_DOCUMENT,
    SAVE_NEEDED,
    SAVED,
    SAVEFILE,
    OPENFILE,
    REQUEST_SAVE
} = require(path.resolve('actions/types'))

let contentToSave = null;

ipcMain.on(SAVE_NEEDED, (event, content) => {
    contentToSave = content;
});

ipcMain.on(SAVEFILE, (evvent, content) => {
    
});

function saveContent(win, forceDialog) {
    if (contentToSave != null) {
        if (forceDialog || !contentToSave.filePath) {
            let selectedFile = dialog.showSaveDialogSync({
                title: "Save File",
                filters: [{
                    name: "Loas",
                    extensions: ['loa']
                }]
            });
            
            if (selectedFile) {
                contentToSave.filePath = selectedFile;
            }
        }

        if (contentToSave.filePath) {
            win.webContents.send(REQUEST_SAVE, contentToSave.filePath);    
        }

    }
}

module.exports = function(win) {
    return Menu.buildFromTemplate([
        {
            label: app.getName(),
            submenu: [
                { 
                    label: 'About',
                    click: () => {
                        console.log("hello world")
                    }
                }
            ]
        },
        {
            label: 'File',
            submenu: [
                { 
                    label: 'New',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        win.webContents.send(NEW_DOCUMENT, 'Create new document');
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'CmdOrCtrl+O',
                    click: () => {

                        let selectedFiles = dialog.showOpenDialogSync({
                            title: "Choose file to open",
                            filters: [{
                                name: "Loas",
                                extensions: ['loa']
                            }]
                        });

                        let fileToOpen = selectedFiles && selectedFiles[0];

                        if (fileToOpen) {
                            win.webContents.send(OPENFILE, fileToOpen);
                        }                        
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        saveContent(win, false);
                    }
                },
                {
                    label: 'Save as...',
                    accelerator: 'CmdOrCtrl+shift+S',
                    click: () => {
                        console.log("Save as...");
                        saveContent(win, true);
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:" },
                { label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:" },
                { type: "separator" },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                { label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:" },
                { label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:" },
                { label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:" }                
            ]
        },
        {
            label: 'Export',
            submenu: [
                {
                    label: 'Video',
                    click: () => {
                        console.log('exporting video');
                    }
                },
                {
                    label: 'GIF',
                    click: () => {
                        console.log('exporting GIF');
                    }
                },
                {
                    label: 'Image Sequence',
                    click: () => {
                        console.log('exporting image sequence');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'TODO',
                    click: () => {}
                }
            ]
        }
    ])
}