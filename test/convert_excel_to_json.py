import pandas as pd
import json

def excel_to_json(excel_file, json_file):
    try:
        # 读取 Excel 文件
        df = pd.read_excel(excel_file)
        
        # 删除重复的图片和路径列
        columns_to_drop = []
        for col in df.columns:
            if '图片.' in col or '图片路径.' in col:
                columns_to_drop.append(col)
        
        df = df.drop(columns=columns_to_drop)
        
        # 转换列名为字符串
        df.columns = df.columns.astype(str)
        
        # 转换为 JSON
        json_data = df.to_json(json_file, force_ascii=False, orient='records', indent=4)
        
        print(f"成功将 '{excel_file}' 转换为 '{json_file}'")
        
    except Exception as e:
        print(f"发生错误: {str(e)}")

if __name__ == "__main__":
    excel_file = "test/问题1.18版.xlsx"
    json_file = "output-final.json"
    
    excel_to_json(excel_file, json_file) 