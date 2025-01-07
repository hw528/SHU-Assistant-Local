from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from .rag_system import RAGSystem
from .configure import API_KEY, BASE_URL
from fastapi.responses import StreamingResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Question(BaseModel):
    question: str
    session_id: str = "default"

class QASystem:
    def __init__(self, api_key, base_url):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.rag = RAGSystem('data/output.json')
        self.conversation_history = {}  # 用于存储每个会话的历史记录

    async def get_answer_stream(self, user_question, session_id="default"):
        # 获取或创建会话历史
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []
        
        context, has_images = self.rag.get_context(user_question)
        
        # 构建完整的对话历史
        messages = [
            {
                "role": "system", 
                "content": """你是上海大学的智能助手。请根据提供的相关问题对来回答用户问题，如果问题超出相关问答对的范围，请说明无法回答。
                            
                            回答要求：
                            1. 使用清晰的段落和标点符号
                            2. 重要信息用加粗显示
                            3. 如果是列举多个项目，使用编号或分点说明
                            4. 保持回答的简洁性和可读性
                            5. 如果有补充说明，单独成段展示
                            6. 如果资料中包含[IMAGE]标记的图片，请判断哪些图片与回答相关，将相关图片的完整标记（包括[IMAGE]和[/IMAGE]）原样加在回答末尾，
                               并在最后添加一句："我为您准备了相关的环境照片，您可以在下方缩略图查看。"
                            """
            }
        ]
        
        # 添加历史对话
        messages.extend(self.conversation_history[session_id])
        
        # 添加当前问题和上下文
        messages.append({
            "role": "user",
            "content": f"是否包含图片：{has_images}\n相关资料：\n{context}\n\n用户问题:{user_question}\n\n请根据以上资料回答用户问题,注意处理资料中的图片标记"
        })

        print(f"Debug - Messages: {messages}")  # 添加调试信息

        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=1.3,
            max_tokens=500,
            stream=True
        )

        # 收集完整的回答
        full_response = ""
        for chunk in response:
            if chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                yield content
        # 更新对话历史
        self.conversation_history[session_id].append({
            "role": "user",
            "content": user_question
        })
        self.conversation_history[session_id].append({
            "role": "assistant",
            "content": full_response
        })
        
        # 保持历史记录在合理范围内（最近5轮对话）
        if len(self.conversation_history[session_id]) > 10:
            self.conversation_history[session_id] = self.conversation_history[session_id][-10:]
    
qa_system = QASystem(API_KEY, BASE_URL)

@app.post("/chat")
async def ask(question: Question):
    async def generate():
        async for chunk in qa_system.get_answer_stream(question.question, question.session_id):
            yield chunk
    
    return StreamingResponse(generate(), media_type='text/event-stream')

@app.get("/")
async def root():
    return {"message": "上海大学智能问答系统API"}

