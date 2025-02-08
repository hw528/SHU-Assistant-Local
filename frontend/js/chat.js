// 在文件顶部定义全局变量
let chatInput, chatContainer, sendButton;

// 生成或获取会话ID
const sessionId = localStorage.getItem('sessionId') || 'session_' + Date.now();
localStorage.setItem('sessionId', sessionId);

// 初始化 Azure Speech 配置
const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
    "EnduDDYtoPnKVMvW8qwR8JCC3wq9lQcwtcdYSBXSbZWG1LR0dfOSJQQJ99BAACYeBjFXJ3w3AAAYACOGvx6I", 
    "eastus"
);
speechConfig.speechSynthesisVoiceName = "zh-CN-XiaoxiaoNeural";
speechConfig.speechSynthesisLanguage = "zh-CN";

// 在文件开头添加获取当前语言的函数
function getCurrentLang() {
    return localStorage.getItem('language') || 'zh';
}

// 在 switch 语句之前获取当前语言
const currentLang = getCurrentLang();

// 创建消息操作按钮函数
function createMessageActions(messageDiv, bubble, originalQuestion) {
    // 创建操作按钮容器
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    // 创建复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-button';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    
    // 创建重新生成按钮
    const regenerateBtn = document.createElement('button');
    regenerateBtn.className = 'action-button';
    regenerateBtn.innerHTML = '<i class="fa-solid fa-sync-alt"></i>';

    // 创建语音按钮
    const speakBtn = document.createElement('button');
    speakBtn.className = 'action-button';
    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';

    // 添加按钮到操作区
    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(regenerateBtn);
    actionsDiv.appendChild(speakBtn);
    
    // 创建悬停区域
    const hoverArea = document.createElement('div');
    hoverArea.className = 'hover-area';
    
    // 重新组织 DOM 结构
    const bubbleParent = bubble.parentNode;
    if (bubbleParent) {
        bubbleParent.removeChild(bubble);
        hoverArea.appendChild(bubble);
        hoverArea.appendChild(actionsDiv);
        bubbleParent.appendChild(hoverArea);
    }
    
    // 添加复制功能
    copyBtn.onclick = async () => {
        try {
            const textToCopy = bubble.innerText || bubble.textContent;
            
            // 使用传统的复制方法作为后备
            const textarea = document.createElement('textarea');
            textarea.value = textToCopy;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // 显示复制成功提示
            copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
            console.log('Text copied successfully');
            
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };
    
    // 添加重新生成功能
    regenerateBtn.onclick = async () => {
        // 移除当前回复
        messageDiv.remove();
        // 重新发送请求
        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: originalQuestion,
                    session_id: sessionId 
                })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            // 创建新的消息容器
            const newMessageDiv = document.createElement('div');
            newMessageDiv.className = 'flex items-start space-x-3 message-container';
            
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            const avatarImg = document.createElement('img');
            avatarImg.src = 'images/avatar.png';
            avatarImg.alt = 'logo';
            avatarDiv.appendChild(avatarImg);
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            newMessageDiv.appendChild(avatarDiv);
            newMessageDiv.appendChild(bubble);
            chatContainer.appendChild(newMessageDiv);

            // 读取流式响应
            const reader = response.body.getReader();
            let accumulatedText = '';

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                
                const text = new TextDecoder().decode(value);
                accumulatedText += text;
                
                try {
                    bubble.innerHTML = marked.parse(accumulatedText);
                } catch (e) {
                    bubble.textContent = accumulatedText;
                }
                
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            // 完成后添加操作按钮
            const actionsDiv = createMessageActions(newMessageDiv, bubble, originalQuestion);
            newMessageDiv.appendChild(actionsDiv);

        } catch (error) {
            console.error('Error:', error);
        }
    };

    let speaking = false;
    let synthesizer = null;
    
    // 初始化语音配置
// 按钮点击事件
speakBtn.onclick = async () => {
    if (speaking) {
        if (synthesizer) {
            synthesizer.stopSpeakingAsync(
                () => {
                    speaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    synthesizer.close();
                    synthesizer = null;
                },
                error => {
                    speaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    if (synthesizer) {
                        synthesizer.close();
                        synthesizer = null;
                    }
                }
            );
        } else {
            speaking = false;
            speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
        }
    } else {
        // 开始播放
        try {
            // 创建新的语音合成器实例
            const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();
            synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
            speaking = true;
            speakBtn.innerHTML = '<i class="fa-solid fa-stop"></i>';

            // 添加事件监听
            synthesizer.synthesisStarted = () => {
                console.log("语音播放开始");
            };

            synthesizer.synthesisCompleted = () => {
                console.log("语音合成完成");
            };

            synthesizer.synthesisCanceled = (s, e) => {
                synthesizer.close(); // 确保释放资源
                synthesizer = null;
                speaking = false;
                speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            };

            synthesizer.synthesisEnded = () => {
                if (speaking) {
                    speaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                    synthesizer.close();
                    synthesizer = null;
                }
            };

            // 开始播放文本内容
            await synthesizer.speakTextAsync(
                bubble.textContent,
                result => {
                },
                error => {
                    console.error("语音播放错误:", error);
                    synthesizer.close(); // 确保资源释放
                    synthesizer = null;
                    speaking = false;
                    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
                }
            );
        } catch (error) {
            speaking = false;
            speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            if (synthesizer) {
                synthesizer.close();
                synthesizer = null;
            }
        }
    }
};

    return actionsDiv;
}

// 功能函数定义
function showFullImage(imagePath, caption) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    modalImg.src = imagePath;
    modalCaption.textContent = caption;
    modal.style.display = 'flex';
    
    modal.onclick = function() {
        modal.style.display = 'none';
    };
}

function showArticle(article) {
    const modal = document.getElementById('articleModal');
    modal.querySelector('h2').textContent = article.title;
    modal.querySelector('img').src = article.cover;
    modal.querySelector('.article-body').innerHTML = article.content;
    modal.style.display = 'block';
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    chatInput = document.querySelector('.chat-input');
    chatContainer = document.querySelector('.flex-col.flex-1.p-6');
    sendButton = document.querySelector('.send-button');
    
    // 初始化所有按钮事件
    initializeButtons();
    
    // 初始化模态框事件
    initializeModals();

    // 更新语言按钮状态
    updateLanguageButtons(currentLang);

    // 在页面加载时调用
    updateHtmlLang(currentLang);
});

function initializeButtons() {
    // 聊天按钮事件
    document.querySelector('.chat-buttons').addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // 获取按钮中的 data-i18n 属性
        const buttonSpan = button.querySelector('[data-i18n]');
        if (!buttonSpan) return;
        
        const buttonType = buttonSpan.getAttribute('data-i18n');
        
        // 使用 data-i18n 属性值来判断按钮类型
        switch(buttonType) {
            case 'campusMap':
                document.getElementById('mapModal').style.display = 'block';
                break;
            
            case 'diningHall':
                const diningMessageDiv = document.createElement('div');
                diningMessageDiv.className = 'flex items-start space-x-3 message-container';
                
                const diningAvatarDiv = document.createElement('div');
                diningAvatarDiv.className = 'avatar';
                const diningAvatarImg = document.createElement('img');
                diningAvatarImg.src = 'https://shu-assistant.obs.cn-east-3.myhuaweicloud.com/images/avatar.png';
                diningAvatarImg.alt = 'logo';
                diningAvatarDiv.appendChild(diningAvatarImg);
                
                const diningBubble = document.createElement('div');
                diningBubble.className = 'message-bubble';
                
                diningBubble.innerHTML = `
                    <a href="https://mp.weixin.qq.com/s/eR7F243STLX341U7m7rhBw" class="wechat-article" data-article-type="dining1" target="_blank">
                        <div class="article-title">${translations[currentLang].diningTitle1}</div>
                        <div class="article-info">
                            <div class="article-desc">${translations[currentLang].diningDesc1}</div>
                            <img src="https://shu-assistant.obs.cn-east-3.myhuaweicloud.com/images/%E7%BE%8E%E9%A3%9F%E6%94%BB%E7%95%A5.png" alt="食堂封面">
                        </div>
                        <div class="article-source">${translations[currentLang].diningSource}</div>
                    </a>
                    
                    <a href="https://mp.weixin.qq.com/s/kikUHJBCSw_oI_pVVu8HIA" class="wechat-article" data-article-type="dining2" target="_blank">
                        <div class="article-title">${translations[currentLang].diningTitle2}</div>
                        <div class="article-info">
                            <div class="article-desc">${translations[currentLang].diningDesc2}</div>
                            <img src="https://shu-assistant.obs.cn-east-3.myhuaweicloud.com/images/%E7%BE%8E%E9%A3%9F%E6%94%BB%E7%95%A5.png" alt="食堂封面">
                        </div>
                        <div class="article-source">${translations[currentLang].diningSource}</div>
                    </a>
                `;
                
                diningMessageDiv.appendChild(diningAvatarDiv);
                diningMessageDiv.appendChild(diningBubble);
                chatContainer.appendChild(diningMessageDiv);
                break;
            
            case 'campusView':
                const viewMessageDiv = document.createElement('div');
                viewMessageDiv.className = 'flex items-start space-x-3 message-container';
                
                const viewAvatarDiv = document.createElement('div');
                viewAvatarDiv.className = 'avatar';
                const viewAvatarImg = document.createElement('img');
                viewAvatarImg.src = 'https://shu-assistant.obs.cn-east-3.myhuaweicloud.com/images/avatar.png';
                viewAvatarImg.alt = 'logo';
                viewAvatarDiv.appendChild(viewAvatarImg);
                
                const viewBubble = document.createElement('div');
                viewBubble.className = 'message-bubble';
                
                viewBubble.innerHTML = `
                    <a href="https://mp.weixin.qq.com/s/jOhn7oXx8G0Aj2YbW84KkQ" class="wechat-article" target="_blank">
                        <div class="article-title">${translations[currentLang].viewTitle}</div>
                        <div class="article-info">
                            <div class="article-desc">${translations[currentLang].viewDesc}</div>
                            <img src="https://shu-assistant.obs.cn-east-3.myhuaweicloud.com/images/%E6%A0%A1%E5%9B%AD%E9%A3%8E%E6%99%AF.png" alt="校园风景">
                        </div>
                        <div class="article-source">${translations[currentLang].viewSource}</div>
                    </a>
                `;
                
                viewMessageDiv.appendChild(viewAvatarDiv);
                viewMessageDiv.appendChild(viewBubble);
                chatContainer.appendChild(viewMessageDiv);
                break;
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    });

    // 发送按钮事件
    sendButton.addEventListener('click', sendMessage);
    
    // 输入框回车事件
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // 返回按钮事件
    const backButton = document.querySelector('.back-button');
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

function initializeModals() {
    // 地图模态框关闭按钮
    const mapCloseBtn = document.querySelector('#mapModal .close');
    if (mapCloseBtn) {
        mapCloseBtn.addEventListener('click', () => {
            document.getElementById('mapModal').style.display = 'none';
        });
    }

    // 地图模态框点击外部关闭
    const mapModal = document.getElementById('mapModal');
    if (mapModal) {
        mapModal.addEventListener('click', (e) => {
            if (e.target === mapModal) {
                mapModal.style.display = 'none';
            }
        });
    }
}

// 发送消息函数
async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // 清空输入框并重置高度
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // 创建用户消息
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'flex items-start space-x-3 message-container user-message';
    userMessageDiv.innerHTML = `
        <div class="message-bubble">${message}</div>
    `;
    chatContainer.appendChild(userMessageDiv);

    const currentLang = getCurrentLang();
    
    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: sessionId,
                language: currentLang
            })
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const reader = response.body.getReader();
        let firstChunk = await reader.read();

        if (!firstChunk.done && firstChunk.value) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'flex items-start space-x-3 message-container';
            
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar';
            const avatarImg = document.createElement('img');
            avatarImg.src = 'images/avatar.png';
            avatarImg.alt = 'logo';
            avatarDiv.appendChild(avatarImg);
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            
            messageDiv.appendChild(avatarDiv);
            messageDiv.appendChild(bubble);

            const actionsDiv = createMessageActions(messageDiv, bubble, message);
            messageDiv.appendChild(actionsDiv);
            
            chatContainer.appendChild(messageDiv);

            let accumulatedText = new TextDecoder().decode(firstChunk.value);
            
           // 在处理流式响应的部分添加调试日志
            if (accumulatedText.includes('[IMAGE]')) {
                const parts = accumulatedText.split(/\[IMAGE\](.*?)\[\/IMAGE\]/);
            }

            try {
                bubble.innerHTML = marked.parse(accumulatedText);
            } catch (e) {
                bubble.textContent = accumulatedText;
            }

            // 继续读取剩余数据
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                
                const text = new TextDecoder().decode(value);
                accumulatedText += text;
                
                try {
                    // 检查是否包含图片标记
                    if (accumulatedText.includes('[IMAGE]')) {
                        // 创建图片缓冲区
                        let imageBuffer = [];
                        
                        // 分割文本和图片标记
                        const parts = accumulatedText.split(/\[IMAGE\](.*?)\[\/IMAGE\]/);
                        let textContent = '';
                        
                        // 处理所有部分
                        for (let i = 0; i < parts.length; i++) {
                            if (i % 2 === 0) {
                                // 文本部分直接添加
                                textContent += parts[i];
                            } else {
                                // 图片部分存入缓冲区
                                const localPath = parts[i].replace('企创图片资料', 'images/企创图片资料');
                                const imageName = parts[i].split('/').pop().replace('.jpg', '');
                                imageBuffer.push({ path: localPath, name: imageName });
                            }
                        }
                        
                        // 先显示所有文本
                        let newHtml = marked.parse(textContent);
                        
                        // 如果有图片，在文本末尾添加图片预览区
                        if (imageBuffer.length > 0) {
                            newHtml += '<div class="image-preview-container">';
                            imageBuffer.forEach(img => {
                                newHtml += `
                                    <div class="image-preview-item">
                                        <img src="${img.path}" alt="${img.name}" 
                                             onclick="showFullImage('${img.path}', '${img.name}')"
                                             class="preview-image">
                                        <div class="image-caption">${img.name}</div>
                                    </div>`;
                            });
                            newHtml += '</div>';
                        }
                        
                        bubble.innerHTML = newHtml;
                    } else {
                        bubble.innerHTML = marked.parse(accumulatedText);
                    }
                } catch (e) {
                    bubble.textContent = accumulatedText;
                }
                
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        bubble.textContent = '系统错误，请稍后重试。';
    }
}

function updateLanguageButtons(currentLang) {
    document.querySelectorAll('.language-selector button').forEach(button => {
        const lang = button.getAttribute('onclick').match(/'(.+?)'/)[1];
        if (lang === currentLang) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

function updateSpeechConfig(lang) {
    switch(lang) {
        case 'en':
            speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
            speechConfig.speechSynthesisLanguage = "en-US";
            break;
        case 'fr':
            speechConfig.speechSynthesisVoiceName = "fr-FR-DeniseNeural";
            speechConfig.speechSynthesisLanguage = "fr-FR";
            break;
        default:
            speechConfig.speechSynthesisVoiceName = "zh-CN-XiaoxiaoNeural";
            speechConfig.speechSynthesisLanguage = "zh-CN";
    }
}

function changeLanguage(lang) {
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    updateContent(lang);
    updateLanguageButtons(lang);
    updateSpeechConfig(lang);
}

function updateHtmlLang(lang) {
    document.documentElement.lang = lang;
}
