const { app, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path')
const { 
    NEW_DOCUMENT,
    SAVE_NEEDED,
    SAVED,
    SAVEFILE,
    OPENFILE
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
                    name: "Javascript",
                    extensions: ['js']
                }]
            });
            
            if (selectedFile) {
                contentToSave.filePath = selectedFile;
            }
        }

        if (contentToSave.filePath) {
            fs.writeFile(contentToSave.filePath, contentToSave.content, (err) => {
                if (err) throw err;
                console.log('saved');
                win.webContents.send(SAVED, contentToSave.filePath);
            });    
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
                    accelerator: 'cmd+N',
                    click: () => {
                        win.webContents.send(NEW_DOCUMENT, 'Create new document');
                    }
                },
                {
                    label: 'Open',
                    accelerator: 'cmd+O',
                    click: () => {

                        let selectedFiles = dialog.showOpenDialogSync({
                            title: "Choose file to open",
                            filters: [{
                                name: "Javascript",
                                extensions: ['js']
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
                    accelerator: 'cmd+S',
                    click: () => {
                        saveContent(win, false);
                    }
                },
                {
                    label: 'Save as...',
                    accelerator: 'cmd+shift+S',
                    click: () => {
                        console.log("Save as...");
                        saveContent(win, true);
                    }
                }
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