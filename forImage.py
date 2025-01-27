import json

def update_image_paths(json_file):
    # Read the JSON file
    with open(json_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Update image paths
    for item in data:
        if item["图片路径"]:
            # 直接修改图片路径格式
            old_path = item["图片路径"]
            # 例如："益新食堂一楼环境" -> "企创图片资料/益新食堂一楼环境.jpg"
            new_path = f"企创图片资料/{old_path}.jpg"
            item["图片路径"] = new_path
            # 清除旧的DISPIMG格式
            item["图片"] = None
    
    # Write back to JSON file
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

# 使用脚本
json_file = 'output-final.json'
update_image_paths(json_file)
print("图片路径更新完成")