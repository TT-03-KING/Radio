const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let closeBehavior = 'ask';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 780,
        transparent: true,
        frame: false,
        backgroundColor: '#00000000',
        resizable: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            // ★ 关键：允许自动播放（无需用户手势）
            autoplayPolicy: 'no-user-gesture-required',
        }
    });

    // ★ 拦截请求，添加 Referer 头（针对 ajmide.com 等防盗链站点）
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url;
        // 对包含特定域名的请求添加 Referer
        if (url.includes('ajmide.com') || url.includes('rscdn-bk') || url.includes('live.hnradio.com')) {
            details.requestHeaders['Referer'] = 'https://www.ajmide.com/';
            details.requestHeaders['Origin'] = 'https://www.ajmide.com/';
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        }
        callback({ requestHeaders: details.requestHeaders });
    });

    mainWindow.loadFile('index.html');
    // 调试用（如需打开，取消注释）
    // mainWindow.webContents.openDevTools();

    mainWindow.on('maximize', () => {
        mainWindow.webContents.send('window-maximized', true);
    });
    mainWindow.on('unmaximize', () => {
        mainWindow.webContents.send('window-maximized', false);
    });

    mainWindow.on('close', (event) => {
        if (closeBehavior === 'exit') return;
        if (closeBehavior === 'tray') {
            event.preventDefault();
            mainWindow.hide();
            return;
        }
        event.preventDefault();
        // 询问逻辑（同之前）
        const { dialog } = require('electron');
        dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['退出程序', '最小化到托盘', '取消'],
            defaultId: 2,
            cancelId: 2,
            title: 'TT-Radio',
            message: '关闭窗口后，希望程序如何运行？',
            detail: '选择"退出程序"将完全关闭；选择"最小化到托盘"将在后台继续播放。'
        }).then((result) => {
            if (result.response === 0) {
                closeBehavior = 'exit';
                mainWindow.destroy();
                app.quit();
            } else if (result.response === 1) {
                closeBehavior = 'tray';
                mainWindow.hide();
                mainWindow.webContents.send('close-behavior-updated', 'tray');
            }
        });
    });

    createTray();
    mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
    // 同之前，略...
}

// IPC 监听（同之前）
ipcMain.on('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) mainWindow.unmaximize();
        else mainWindow.maximize();
    }
});
ipcMain.on('window-close', () => { if (mainWindow) mainWindow.close(); });
ipcMain.on('set-close-behavior', (event, mode) => {
    closeBehavior = mode;
    mainWindow.webContents.send('close-behavior-updated', mode);
});

app.whenReady().then(createWindow);
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});