const { app, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path')
const { NEW_DOCUMENT_NEEDED, SAVE_NEEDED, SAVED, SAVEFILE } = require(path.resolve('actions/types'))

let contentToSave = null;

ipcMain.on(SAVE_NEEDED, (event, content) => {
    contentToSave = content;
});

ipcMain.on(SAVEFILE, (evvent, content) => {
    
});

module.exports = function(win) {
    return Menu.buildFromTemplate([
        {
            label: app.getName(),
            submenu: [
                { label: `Hello`, click: () => console.log("hello world")}
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { label: "Undo", role: 'undo' }
                , { label: "Redo", role: 'redo' }
                , { label: "Cut", role: 'cut' }
                , { label: "Copy", role: 'copy' }
                , { label: "Paste", role: 'paste' }

            ]
        },
        {
            label: 'Custom Menu',
            submenu: [
                { 
                    label: 'New',
                    accelerator: 'cmd+N',
                    click: () => {
                        win.webContents.send(NEW_DOCUMENT_NEEDED, 'Create new document');
                    }
                },
                {
                    label: 'Save',
                    accelerator: 'cmd+S',
                    click: () => {
                        if (contentToSave != null) {
                            
                            fs.writeFile(contentToSave.filePath, contentToSave.content, (err) => {
                                if (err) throw err;
                                console.log('saved');
                                win.webContents.send(SAVED, 'File Saved');
                            });

                            win.webContents.send(SAVED, 'save file');                            
                        }
                    }
                },
                {
                    label: 'Save Sequence',
                    click: () => {
                        
                    }
                }
            ]
        }
    ])
}