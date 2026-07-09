const { app, BrowserWindow, ipcMain, session, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
let tray = null;
let closeBehavior = 'ask';

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1066,                 // 16:9 比例 (1066x600)
        height: 600,
        transparent: true,
        frame: false,
        backgroundColor: '#00000000',
        resizable: true,
        // ★ 限制宽高比为 16:9
        aspectRatio: 16 / 9,
        // ★ 设置最小尺寸（防止缩得过小）
        minWidth: 800,
        minHeight: 450,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            autoplayPolicy: 'no-user-gesture-required',
        }
    });

    // 添加请求头（防盗链等）
    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
        const url = details.url;
        if (url.includes('live.hnradio.com') || url.includes('ajmide.com') || url.includes('rscdn-bk')) {
            details.requestHeaders['Referer'] = 'https://www.ajmide.com/';
            details.requestHeaders['Origin'] = 'https://www.ajmide.com/';
            details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
        }
        callback({ requestHeaders: details.requestHeaders });
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();

    mainWindow.on('maximize', () => {
        if (mainWindow) {
            mainWindow.webContents.send('window-maximized', true);
        }
    });
    mainWindow.on('unmaximize', () => {
        if (mainWindow) {
            mainWindow.webContents.send('window-maximized', false);
        }
    });

    mainWindow.on('close', (event) => {
        if (closeBehavior === 'exit') return;
        if (closeBehavior === 'tray') {
            event.preventDefault();
            mainWindow.hide();
            return;
        }
        event.preventDefault();
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
                if (mainWindow) {
                    mainWindow.webContents.send('close-behavior-updated', 'tray');
                }
            }
        });
    });

    createTray();
    mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
    let iconPath = path.join(__dirname, 'icon.ico');
    let trayIcon;
    try {
        trayIcon = nativeImage.createFromPath(iconPath);
        if (trayIcon.isEmpty()) throw new Error('Icon not found');
    } catch (e) {
        trayIcon = nativeImage.createEmpty();
        console.warn('未找到 icon.ico');
    }
    tray = new Tray(trayIcon);
    const contextMenu = Menu.buildFromTemplate([
        { label: '显示 TT-Radio', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
        { type: 'separator' },
        { label: '关闭时询问', click: () => { closeBehavior = 'ask'; if (mainWindow) mainWindow.webContents.send('close-behavior-updated', 'ask'); } },
        { label: '直接退出程序', click: () => { closeBehavior = 'exit'; } },
        { label: '最小化到托盘', click: () => { closeBehavior = 'tray'; if (mainWindow) mainWindow.hide(); } },
        { type: 'separator' },
        { label: '退出 TT-Radio', click: () => { app.quit(); } }
    ]);
    tray.setToolTip('TT-Radio 正在播放');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
    });
}

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
    if (mainWindow) {
        mainWindow.webContents.send('close-behavior-updated', mode);
    }
});

app.whenReady().then(createWindow);
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
});