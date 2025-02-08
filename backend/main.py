from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from .rag_system import RAGSystem
from .configure import API_KEY, BASE_URL
from fastapi.responses import StreamingResponse
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

class Question(BaseModel):
    message: str
    session_id: str
    language: str = 'zh'

class QASystem:
    def __init__(self, api_key, base_url):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.rag = RAGSystem('data/output.json')
        self.conversation_history = {}  # 用于存储每个会话的历史记录

    async def get_answer_stream(self, user_question, session_id="default", system_prompt=""):
        # 获取或创建会话历史
        if session_id not in self.conversation_history:
            self.conversation_history[session_id] = []
        
        context, has_images = self.rag.get_context(user_question)
        
        # 构建完整的对话历史
        messages = [
            {
                "role": "system", 
                "content": system_prompt
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
    base_prompt = """如果资料中包含[IMAGE]标记的图片，请根据图片路径中的名称判断哪些图片与回答相关，将相关图片的完整标记（包括[IMAGE]和[/IMAGE]）原样加在回答末尾，
                   并在最后添加一句："""
                   
    image_note = {
        'zh': "我为您准备了相关的环境照片，您可以在下方缩略图查看。",
        'en': "I have prepared relevant environment photos for you, which you can view in the thumbnails below.",
        'fr': "J'ai préparé des photos d'environnement pertinentes pour vous, que vous pouvez voir dans les vignettes ci-dessous."
    }

    system_prompts = {
        'zh': f"""你是上海大学的智能助手。请根据提供的相关问题对来回答用户问题，如果问题超出相关问答对的范围，请说明无法回答。
                
                回答要求：
                1. 使用清晰的段落和标点符号
                2. 每条消息都要有加粗显示的部分,不要整句话加粗，只加粗关键词。
                3. 如果是列举多个项目，使用编号或分点说明
                4. {base_prompt}{image_note['zh']}
                5. 请一定一定不要随便把图片加进去！！根据图片路径来判断，如果没有关系，一定不要加，宁可少加也不能多加，切记切记。
                6. 当被问到"你好"等相关问候语时，请回复"**你好呀! ** 请问你有什么具体问题需要帮助吗?以下是一些**热点问题** :\n1.选课指导\n 2.食堂推荐\n 3.校园活动\n 4.校园风景\n 5.自习室预约\n如果你有其他问题或需要进一步的帮助，随时可以联系我!"
                7. 当参考信息与问题无关的时候，不要用参考信息！！""",
                   
        'en': f"""You are an intelligent assistant at Shanghai University. Please answer user questions based on the provided Q&A pairs. If the question is beyond the scope of the provided answers, please indicate that you cannot answer.
                
                Response requirements:
                1. Use clear paragraphs and punctuation
                2. Each message must have bold parts, don't bold entire sentences, only bold keywords
                3. Use numbers or bullets for multiple items
                4. {base_prompt}{image_note['en']}
                5. 请一定一定不要随便把图片加进去！！根据图片路径来判断，如果没有关系，一定不要加，宁可少加也不能多加，切记切记。
                6. When greeted with "hello" or similar greetings, please reply "**Hello! ** How can I help you? Here are some **hot topics**:\n1. Course Selection Guide\n2. Canteen Recommendations\n3. Campus Activities\n4. Campus Scenery\n5. Study Room Reservation\nIf you have other questions or need further assistance, feel free to ask!"
                7. When the reference information is irrelevant to the question, don't use it!""",
                   
        'fr': f"""Vous êtes l'assistant intelligent de l'Université de Shanghai. Veuillez répondre aux questions des utilisateurs en fonction des paires Q&R fournies. Si la question dépasse la portée des réponses fournies, veuillez indiquer que vous ne pouvez pas répondre.
                
                Exigences de réponse:
                1. Utilisez des paragraphes et une ponctuation claire
                2. Chaque message doit avoir des parties en gras, ne mettez pas des phrases entières en gras, uniquement les mots-clés
                3. Utilisez des numéros ou des puces pour plusieurs éléments
                4. {base_prompt}{image_note['fr']}
                5. 请一定一定不要随便把图片加进去！！根据图片路径来判断，如果没有关系，一定不要加，宁可少加也不能多加，切记切记。
                6. Lorsqu'on vous salue avec "bonjour" ou des salutations similaires, veuillez répondre "**Bonjour! ** Comment puis-je vous aider? Voici quelques **sujets populaires**:\n1. Guide de sélection des cours\n2. Recommandations de cantine\n3. Activités du campus\n4. Paysages du campus\n5. Réservation de salle d'étude\nSi vous avez d'autres questions ou besoin d'aide supplémentaire, n'hésitez pas à demander!"
                7. Lorsque les informations de référence ne sont pas pertinentes pour la question, ne les utilisez pas!"""
    }

    system_prompt = system_prompts.get(question.language, system_prompts['zh'])
    
    async def generate():
        async for chunk in qa_system.get_answer_stream(question.message, question.session_id, system_prompt):
            yield chunk
    
    return StreamingResponse(generate(), media_type='text/event-stream')

@app.get("/")
async def root():
    return {"message": "上海大学智能问答系统API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)  # 使用 8000 端口
