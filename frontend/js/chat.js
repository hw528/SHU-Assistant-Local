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

// 创建消息操作按钮函数
function createMessageActions(messageDiv, bubble, originalQuestion) {

    // 创建操作按钮容器
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    // 创建消息内容容器（包含气泡和操作按钮）
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        flex: 1;
    `;
    
    // 创建悬停区域（只包裹气泡）
    const hoverArea = document.createElement('div');
    hoverArea.className = 'hover-area';
    hoverArea.style.cssText = `
        position: relative;
        display: inline-block;
    `;
    
    // 修改头像样式
    const avatar = messageDiv.querySelector('.w-10.h-10');
    if (avatar) {
        avatar.className = 'avatar';
    }
    
    // 重新组织 DOM 结构
    const bubbleParent = bubble.parentNode;
    if (bubbleParent) {
        bubbleParent.removeChild(bubble);
        hoverArea.appendChild(bubble);
        contentContainer.appendChild(hoverArea);
        contentContainer.appendChild(actionsDiv);
        bubbleParent.appendChild(contentContainer);
    }
    
    // 复制按钮
    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-button';
    copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
    copyBtn.onclick = () => {
        navigator.clipboard.writeText(bubble.textContent);
        // 显示复制成功提示
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
            copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i>';
        }, 2000);
    };
    
    // 重新生成按钮
    const regenerateBtn = document.createElement('button');
    regenerateBtn.className = 'action-button';
    regenerateBtn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
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

            const reader = response.body.getReader();
            let firstChunk = await reader.read();

            if (!firstChunk.done && firstChunk.value) {
                // 创建新的消息容器
                const newMessageDiv = document.createElement('div');
                newMessageDiv.className = 'flex items-start space-x-3 message-container';
                
                const avatarDiv = document.createElement('div');
                avatarDiv.className = 'w-10 h-10 bg-gray-300 rounded-full';
                
                const newBubble = document.createElement('div');
                newBubble.className = 'message-bubble';
                
                newMessageDiv.appendChild(avatarDiv);
                newMessageDiv.appendChild(newBubble);
                
                // 添加新的消息操作按钮
                const newActionsDiv = createMessageActions(newMessageDiv, newBubble, originalQuestion);
                newMessageDiv.appendChild(newActionsDiv);
                
                chatContainer.appendChild(newMessageDiv);

                // 处理第一个数据块
                let accumulatedText = new TextDecoder().decode(firstChunk.value);
                try {
                    newBubble.innerHTML = marked.parse(accumulatedText);
                } catch (e) {
                    newBubble.textContent = accumulatedText;
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
        }
    };

    // 语音按钮
    const speakBtn = document.createElement('button');
    speakBtn.className = 'action-button';
    speakBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    
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

    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(regenerateBtn);
    actionsDiv.appendChild(speakBtn);
    
    return actionsDiv;
}

// DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    chatInput = document.querySelector('.chat-input');
    chatContainer = document.querySelector('.flex-col.flex-1.p-6');
    sendButton = document.querySelector('.send-button');
    const backButton = document.querySelector('.back-button');

    // 发送消息函数
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // 添加用户消息
        const messageDiv = document.createElement('div');
        messageDiv.className = 'flex items-start space-x-3 user-message';
        messageDiv.innerHTML = `
            <div class="message-bubble" style="background-color: #e3f2fd;">
                ${message}
            </div>
        `;
        chatContainer.appendChild(messageDiv);
        
        // 清空输入框
        chatInput.value = '';

        try {
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    question: message,
                    session_id: sessionId 
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
                avatarDiv.className = 'w-10 h-10 bg-gray-300 rounded-full';
                
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
        }
    }

    // 添加事件监听器
    sendButton.addEventListener('click', () => {
        sendMessage();
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    backButton.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
});

// 添加在文件末尾
function showFullImage(imagePath, caption) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    
    modalImg.src = imagePath;
    modalCaption.textContent = caption;
    modal.style.display = 'flex';
    
    // 点击模态框任意位置关闭
    modal.onclick = function() {
        modal.style.display = 'none';
    };
}
