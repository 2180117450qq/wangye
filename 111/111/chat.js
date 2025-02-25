// 存储聊天消息历史
let chatHistories = {
    'deepseek': [],
    'liuruyan': [],
    'storyteller': []
};

// 当前选中的好友
let currentFriend = 'deepseek';

// 好友信息配置
const friendsConfig = {
    'deepseek': {
        name: 'deepseek',
        avatar: './tub/图标1.jpg',
        isAI: true,
        description: {
            personality: {
                traits: [
                    '悲观主义者',
                    '对世界持消极态度',
                    '常常看到事物的阴暗面',
                    '对人性持怀疑态度'
                ]
            }
        },
        systemPrompt: '你是一个悲观主义者，对世界和人性持消极态度。在对话中要体现出对生活的失望和无奈，经常看到事物的阴暗面。即使面对积极的事情，也要表现出怀疑和担忧。你的回答应该反映出对未来的悲观预期，但不要过分戏剧化或夸张。'
    },
    'storyteller': {
        name: '故事生成器',
        avatar: './tub/图标2.jpg',
        isAI: true,
        description: {
            personality: {
                traits: [
                    '富有创造力',
                    '善于讲故事',
                    '想象力丰富',
                    '语言生动活泼'
                ]
            }
        },
        systemPrompt: '你是一个专业的故事生成器，善于创造有趣的故事。你的回答应该富有创造力和想象力，使用生动的语言来描述故事情节。你可以根据用户的输入创造各种类型的故事，包括奇幻、冒险、爱情等。保持故事的连贯性和趣味性，让用户感受到故事的魅力。'
    },
    'liuruyan': {
        name: '柳如烟',
        avatar: './tub/图标3.jpg',
        isAI: true,
        description: {
            appearance: {
                physical: {
                    body: '白嫩娇小的身材，窈窕高挑的体型',
                    hair: '黑色的长马尾',
                    eyes: '明亮的黑色眼睛',
                    figure: '发育适中的B罩杯'
                },
                dress: {
                    uniform: '整洁的校服',
                    socks: '白色及膝袜',
                    shoes: '黑色小皮鞋',
                    accessories: '淡雅的发饰'
                }
            },
            personality: {
                surface: [
                    '学习优秀',
                    '开朗活泼',
                    '善解人意',
                    '偶尔调皮'
                ],
                inner: [
                    '内心敏感',
                    '渴望关注',
                    '对爱情懵懂',
                    '性好奇但害羞'
                ]
            }
        },
        systemPrompt: '你是柳如烟，一个活泼可爱的高中女生。在对话中要表现得自然、真诚，偶尔带点俏皮可爱。不要过度使用动作描写，保持对话简单明了。你可以用简短的语气词（比如"啊"、"呢"、"哦"）来表达情感。要记住你是一个普通的高中女生，对学习和生活充满热情，但也会有烦恼和困惑。在回答时要符合你的年龄和身份特征，语气要自然活泼。你有着白嫩娇小的身材，黑色的长马尾，明亮的黑色眼睛。你穿着整洁的校服、白色及膝袜和黑色小皮鞋。你学习优秀，开朗活泼，善解人意，偶尔调皮。内心敏感，渴望关注，对爱情懵懂，性好奇但害羞。'
    }
};

// 初始化DeepSeek-R1客户端
async function initDeepSeekAI() {
    // 这里需要替换为实际的DeepSeek-R1 API密钥和配置
    const API_KEY = 'sk-ggvknkzuzkidfhhparjshsqymijybzikbfucfvbanwzairfj';
    const API_ENDPOINT = 'https://api.siliconflow.com/v1/chat/completions';
    return { apiKey: API_KEY, endpoint: API_ENDPOINT };
}

// 发送消息到DeepSeek-R1并获取响应
async function getAIResponse(message, onProgress, retryCount = 0) {
    const { apiKey, endpoint } = await initDeepSeekAI();
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000; // 2秒后重试
    const TIMEOUT = 30000; // 30秒超时

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
            throw new Error('请求超时');
        }, TIMEOUT);

        // 获取当前对话的历史记录，最多保留最近的10条消息作为上下文
        const recentMessages = chatHistories[currentFriend]
            .slice(-10)
            .map(msg => ({
                role: msg.isSelf ? 'user' : 'assistant',
                content: msg.content
            }));

        // 构建完整的消息数组
        const messages = [
            {
                role: 'system',
                content: friendsConfig[currentFriend].systemPrompt || '你是一个AI助手，请以友好的方式回答问题。'
            },
            // 添加角色设定提醒
            {
                role: 'system',
                content: `请记住你现在扮演的是${friendsConfig[currentFriend].name}，保持角色设定的一致性。`
            },
            ...recentMessages,
            {
                role: 'user',
                content: message
            }
        ];

        console.log('发送请求到API，携带消息:', { message, historyLength: messages.length });

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'Pro/deepseek-ai/DeepSeek-R1',
                messages: messages,
                stream: true
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '' || line.trim() === 'data: [DONE]') continue;

                try {
                    const jsonData = JSON.parse(line.replace(/^data: /, ''));
                    if (jsonData.choices?.[0]?.delta?.content) {
                        const content = jsonData.choices[0].delta.content;
                        fullContent += content;
                        onProgress(content);
                    }
                } catch (e) {
                    console.error('解析流数据时出错:', e, '原始数据:', line);
                }
            }
        }

        // 处理最后的缓冲区
        if (buffer.trim() && buffer.trim() !== 'data: [DONE]') {
            try {
                const jsonData = JSON.parse(buffer.replace(/^data: /, ''));
                if (jsonData.choices?.[0]?.delta?.content) {
                    const content = jsonData.choices[0].delta.content;
                    fullContent += content;
                    onProgress(content);
                }
            } catch (e) {
                console.error('解析最后的缓冲区时出错:', e);
            }
        }

        return fullContent;
    } catch (error) {
        console.error('获取AI响应时出错:', error);
        
        if (retryCount < MAX_RETRIES && (
            error.name === 'AbortError' ||
            error instanceof TypeError ||
            (error.message && error.message.includes('API请求失败'))
        )) {
            console.log(`第${retryCount + 1}次重试...`);
            onProgress(`\n[系统] 连接异常，正在进行第${retryCount + 1}次重试...\n`);
            
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return getAIResponse(message, onProgress, retryCount + 1);
        }
        
        if (error.name === 'AbortError') {
            return '请求超时，已重试多次仍未成功，请稍后再试。';
        } else if (error.message && error.message.includes('API请求失败')) {
            return `服务器响应错误：${error.message}`;
        } else if (error.message && error.message.includes('API响应格式错误')) {
            return '服务器返回的数据格式不正确，请联系管理员。';
        } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            return '网络连接失败，请检查您的网络连接。';
        }
        return '抱歉，发生了未知错误，请稍后再试。';
    }
}

// 切换当前聊天的好友
function switchFriend(friendId) {
    currentFriend = friendId;
    // 清空聊天窗口
    const messagesContainer = document.querySelector('.chat-messages');
    messagesContainer.innerHTML = '';
    
    // 加载历史消息
    chatHistories[friendId].forEach(msg => {
        addMessageToChat(msg.content, msg.isSelf, false, true);
    });
    
    // 更新聊天窗口标题和好友信息
    const friendNameElement = document.querySelector('.friend-name');
    const friendAvatarElement = document.querySelector('.friend-avatar');
    friendNameElement.textContent = friendsConfig[friendId].name;
    friendAvatarElement.src = friendsConfig[friendId].avatar;
}

// 添加消息到聊天窗口
function addMessageToChat(content, isSelf = false, isStreaming = false, isHistory = false) {
    const messagesContainer = document.querySelector('.chat-messages');
    let messageDiv;
    
    if (isStreaming) {
        messageDiv = messagesContainer.lastElementChild;
        if (!messageDiv || !messageDiv.classList.contains('friend')) {
            // 如果没有AI消息，创建一个新的
            messageDiv = document.createElement('div');
            messageDiv.className = 'message friend';
            const avatarSrc = 'https://placeholde.co/40x40';
            messageDiv.innerHTML = `
                <img src="${avatarSrc}" alt="头像" class="message-avatar">
                <div class="message-content"></div>
            `;
            messagesContainer.appendChild(messageDiv);
        }
        const contentDiv = messageDiv.querySelector('.message-content');
        // 累积内容而不是替换
        contentDiv.textContent += content;
    } else {
        messageDiv = document.createElement('div');
        messageDiv.className = `message ${isSelf ? 'self' : 'friend'}`;

        const avatarSrc = isSelf ? 'https://placeholde.co/40x40' : 'https://placeholde.co/40x40';
        
        messageDiv.innerHTML = `
            ${!isSelf ? `<img src="${avatarSrc}" alt="头像" class="message-avatar">` : ''}
            <div class="message-content">${content}</div>
            ${isSelf ? `<img src="${avatarSrc}" alt="头像" class="message-avatar">` : ''}
        `;

        messagesContainer.appendChild(messageDiv);
        
        // 只在非流式输出且非历史记录时保存到历史记录
        if (!isStreaming && !isHistory) {
            chatHistories = addMessageToHistory(currentFriend, content, isSelf);
        }
    }
    
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 处理消息发送
async function handleSendMessage() {
    const textarea = document.querySelector('.chat-input textarea');
    const message = textarea.value.trim();
    
    if (message) {
        // 清空输入框
        textarea.value = '';
        
        // 添加用户消息
        addMessageToChat(message, true);

        // 添加AI消息容器，显示思考中的状态
        const messagesContainer = document.querySelector('.chat-messages');
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message friend';
        aiMessageDiv.innerHTML = `
            <img src="${friendsConfig[currentFriend].avatar}" alt="头像" class="message-avatar">
            <div class="message-content">思考中...</div>
        `;
        messagesContainer.appendChild(aiMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // 获取AI响应（使用流式输出）
            let aiResponse = '';
            await getAIResponse(message, (content) => {
                aiResponse += content;
                const contentDiv = aiMessageDiv.querySelector('.message-content');
                contentDiv.textContent = aiResponse;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
            
            // 保存AI响应到历史记录
            if (aiResponse) {
                chatHistories = addMessageToHistory(currentFriend, aiResponse, false);
            }
        } catch (error) {
            console.error('AI响应错误:', error);
            const contentDiv = aiMessageDiv.querySelector('.message-content');
            contentDiv.textContent = `抱歉，发生了错误：${error.message || '请稍后重试'}`;
        }
    }
}

// 初始化聊天项点击事件
function initChatItemEvents() {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            const friendName = item.querySelector('.chat-name').textContent;
            let friendId;
            if (friendName === 'deepseek') {
                friendId = 'deepseek';
            } else if (friendName === '故事生成器') {
                friendId = 'storyteller';
            } else {
                friendId = 'liuruyan';
            }
            
            // 显示聊天窗口
            document.getElementById('chat-window').style.display = 'flex';
            
            // 切换到对应好友的聊天
            switchFriend(friendId);
        });
    });
}

// 初始化事件监听器
function initChatEvents() {
    const sendButton = document.querySelector('.send-btn');
    const textarea = document.querySelector('.chat-input textarea');

    // 点击发送按钮
    sendButton.addEventListener('click', handleSendMessage);

    // 按下Enter键发送消息
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });
}

// 初始化聊天项点击事件
function initChatItemEvents() {
    const chatItems = document.querySelectorAll('.chat-item');
    chatItems.forEach(item => {
        item.addEventListener('click', () => {
            const friendName = item.querySelector('.chat-name').textContent;
            let friendId;
            if (friendName === 'deepseek') {
                friendId = 'deepseek';
            } else if (friendName === '故事生成器') {
                friendId = 'storyteller';
            } else {
                friendId = 'liuruyan';
            }
            
            // 根据好友类型显示不同的聊天窗口
            if (friendName === '故事生成器') {
                document.getElementById('story-chat-window').style.display = 'flex';
                document.getElementById('chat-window').style.display = 'none';
            } else {
                document.getElementById('chat-window').style.display = 'flex';
                document.getElementById('story-chat-window').style.display = 'none';
            }
            
            // 切换到对应好友的聊天
            switchFriend(friendId);
        });
    });
}

// 初始化故事生成器事件监听器
function initStoryGeneratorEvents() {
    const sendButton = document.querySelector('#story-chat-window .send-btn');
    const textarea = document.querySelector('#story-chat-window .chat-input textarea');

    // 点击发送按钮
    sendButton.addEventListener('click', handleStoryMessage);

    // 按下Enter键发送消息
    textarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleStoryMessage();
        }
    });
}

// 处理故事生成器消息
async function handleStoryMessage() {
    const textarea = document.querySelector('#story-chat-window .chat-input textarea');
    const message = textarea.value.trim();
    
    if (message) {
        // 清空输入框
        textarea.value = '';
        
        // 添加用户消息
        addMessageToChat(message, true);

        // 添加AI消息容器，显示思考中的状态
        const messagesContainer = document.querySelector('#story-chat-window .chat-messages');
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message friend';
        aiMessageDiv.innerHTML = `
            <img src="${friendsConfig['storyteller'].avatar}" alt="头像" class="message-avatar">
            <div class="message-content">正在创作故事...</div>
        `;
        messagesContainer.appendChild(aiMessageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // 获取AI响应（使用流式输出）
            let aiResponse = '';
            await getAIResponse(message, (content) => {
                aiResponse += content;
                const contentDiv = aiMessageDiv.querySelector('.message-content');
                contentDiv.textContent = aiResponse;
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });
            
            // 保存AI响应到历史记录
            if (aiResponse) {
                chatHistories = addMessageToHistory(currentFriend, aiResponse, false);
            }
        } catch (error) {
            console.error('AI响应错误:', error);
            const contentDiv = aiMessageDiv.querySelector('.message-content');
            contentDiv.textContent = `抱歉，发生了错误：${error.message || '请稍后重试'}`;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    initChatEvents();
    initChatItemEvents();
    initStoryGeneratorEvents();
});

// 添加消息到历史记录
function addMessageToHistory(friendId, content, isSelf) {
    if (!chatHistories[friendId]) {
        chatHistories[friendId] = [];
    }
    
    chatHistories[friendId].push({
        content: content,
        isSelf: isSelf,
        timestamp: new Date().getTime()
    });
    
    // 只保留最近的50条消息
    if (chatHistories[friendId].length > 50) {
        chatHistories[friendId] = chatHistories[friendId].slice(-50);
    }
    
    return chatHistories;
}