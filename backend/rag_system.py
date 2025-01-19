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

    def get_context(self, query):
        query_embedding = self.model.encode([query])
        similarities = cosine_similarity(query_embedding, self.question_embeddings)[0]
        
        # 找出所有相似度大于0.75的索引
        relevant_indices = [idx for idx in range(len(similarities)) if similarities[idx] > 0.75]
        # 按相似度降序排序
        relevant_indices.sort(key=lambda idx: similarities[idx], reverse=True)

        if not relevant_indices:  # 如果没有相似度大于0.75的结果
            return "抱歉，我没有找到足够相关的问答对。请尝试换个方式提问。", False

        context = "以下是相关问答对：\n\n"
        has_images = False
        images = []
        
        for idx in relevant_indices:
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
        
        return context, has_images
            