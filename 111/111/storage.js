// 聊天记录存储管理
const fs = require('fs');
const path = require('path');

// 存储文件路径
const STORAGE_FILE = path.join(__dirname, 'chat_histories.json');

// 从文件加载聊天记录
function loadChatHistories() {
    try {
        if (fs.existsSync(STORAGE_FILE)) {
            const data = fs.readFileSync(STORAGE_FILE, 'utf8');
            return JSON.parse(data);
        }
        return {
            'deepseek': [],
            'liuruyan': []
        };
    } catch (error) {
        console.error('加载聊天记录失败:', error);
        return {
            'deepseek': [],
            'liuruyan': []
        };
    }
}

// 保存聊天记录到文件
function saveChatHistories(histories) {
    try {
        const data = JSON.stringify(histories, null, 2);
        fs.writeFileSync(STORAGE_FILE, data, 'utf8');
    } catch (error) {
        console.error('保存聊天记录失败:', error);
    }
}

// 添加新消息到聊天记录
function addMessageToHistory(friendId, content, isSelf) {
    const histories = loadChatHistories();
    if (!histories[friendId]) {
        histories[friendId] = [];
    }
    
    histories[friendId].push({
        content,
        isSelf,
        timestamp: new Date().toISOString()
    });
    
    saveChatHistories(histories);
    return histories;
}

// 清空指定好友的聊天记录
function clearChatHistory(friendId) {
    const histories = loadChatHistories();
    histories[friendId] = [];
    saveChatHistories(histories);
    return histories;
}

// 导出存储管理函数
export {
    loadChatHistories,
    saveChatHistories,
    addMessageToHistory,
    clearChatHistory
};
