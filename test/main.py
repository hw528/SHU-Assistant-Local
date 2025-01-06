import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from openai import OpenAI
from backend.rag_system import RAGSystem

class QASystem:
    def __init__(self, api_key, base_url):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
        self.rag = RAGSystem('data/output.json')

    def get_answer(self, user_question):
        context = self.rag.get_context(user_question)

        messages = [
            {
             "role": "system", 
             "content": "你是上海大学的智能助手。请根据提供的相关问题对来回答用户问题，如果问题超出相关问答对的范围，请说明无法回答"
            },

            {
             "role" : "user", 
             "content" : f"相关资料：\n{context}\n\n用户问题:{user_question}\n\n请根据以上资料回答用户问题"
            }
        ]

        print("\n用户提升：", messages[1]['content'])

        response = self.client.chat.completions.create(
            model = "deepseek-chat",
            messages = messages,
            temperature=1.3,
            max_tokens=500,
            stream=False
        )

        return response.choices[0].message.content
    
def main():

    api_key = "sk-27a5eb6455194cc082a30ae997dc1604"
    base_url = "https://api.deepseek.com"
    qa_system = QASystem(api_key, base_url)

    while True:
        question = input("\n请输入您的问题（输入'q'退出）：")

        if question.lower() == 'q':
            break

        answer = qa_system.get_answer(question)
        print("\n回答：", answer)

if __name__ == "__main__":
    main()
        