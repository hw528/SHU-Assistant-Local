from sentence_transformers import SentenceTransformer
import json
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class RAGSystem:
    def __init__(self, json_file):
        self.model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')

        with open(json_file, 'r', encoding='utf-8') as f:
            self.data = json.load(f)

        self.questions = [item['具体问题'] for item in self.data if '具体问题' in item]
        self.question_embeddings = self.model.encode(self.questions)

    def get_context(self, query, top_k = 10):
        query_embedding = self.model.encode([query])
        similarities = cosine_similarity(query_embedding, self.question_embeddings)[0]
        top_indices = similarities.argsort()[-top_k:][::-1]

        context = "以下是相关问答对：\n\n"
        has_images = False
        
        # 收集所有图片路径
        images = []
        for idx in top_indices:
            context += f"问:{self.questions[idx]}\n"
            context += f"答:{self.data[idx]['标准回答']}\n"
            if self.data[idx]['补充说明']:
                context += f"补充：{self.data[idx]['补充说明']}\n"
            if self.data[idx]['图片路径']:
                images.append(self.data[idx]['图片路径'])
                has_images = True
        
        # 在文本末尾添加所有图片
        for image_path in images:
            context += f"\n[IMAGE]{image_path}[/IMAGE]"
        print(f"Debug - Final context: {context}")  # 添加调试信息
        return context, has_images
            