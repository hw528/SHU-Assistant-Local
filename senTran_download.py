from transformers import AutoTokenizer, AutoModel
import os

# 模型名称
model_name = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

# 设置缓存目录
os.environ['TRANSFORMERS_CACHE'] = "/Users/wuhaodong/.cache/huggingface/transformers"

# 下载模型并缓存
tokenizer = AutoTokenizer.from_pretrained(model_name, cache_dir=os.environ['TRANSFORMERS_CACHE'], force_download=True)
model = AutoModel.from_pretrained(model_name, cache_dir=os.environ['TRANSFORMERS_CACHE'], force_download=True)

print("Download complete!")