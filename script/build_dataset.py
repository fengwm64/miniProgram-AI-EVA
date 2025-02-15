#!/usr/bin/env python3
import os
import json

# 数据集所在目录（相对于项目根目录）
dataset_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dataset")
# 输出的 JSON 文件路径，放在 dataset 目录下
output_json = os.path.join(dataset_dir, "labels.json")

# 是否使用 CDN 前缀，True 使用 CDN，False 使用 GitHub Raw 地址
use_cdn = True

# CDN 前缀（注意末尾包含斜杠），这里假设 CDN 上的目录结构与 GitHub 保持一致
cdn_prefix = "https://hub.fnas64.xin"
# GitHub Raw 地址基本路径，请根据你的实际仓库地址修改
base_url = "https://raw.githubusercontent.com/fengwm64/miniProgram-AI-EVA/main/dataset"

# 支持的图片文件扩展名
supported_ext = [".jpg", ".jpeg", ".png"]

dataset = {"images": []}

# 遍历 dataset 目录下的所有子文件夹
for label in os.listdir(dataset_dir):
    subdir_path = os.path.join(dataset_dir, label)
    if os.path.isdir(subdir_path):
        # label 为子文件夹名称，例如 "0", "add" 等
        for filename in os.listdir(subdir_path):
            if any(filename.lower().endswith(ext) for ext in supported_ext):
                # 构造图片相对路径，例如 "0/xxx.jpg"
                relative_path = os.path.join(label, filename)
                # 根据是否使用 CDN 构造图片 URL
                if use_cdn:
                    # 拼接 CDN 前缀，并确保路径分隔符为 '/'
                    image_url = f"{cdn_prefix}/{base_url}/{relative_path.replace(os.sep, '/')}"
                else:
                    image_url = f"{base_url}/{relative_path.replace(os.sep, '/')}"
                dataset["images"].append({
                    "name": relative_path,
                    "url": image_url,
                    "label": label
                })

# 可选：按照 label 和文件名排序，保证 JSON 顺序固定
dataset["images"].sort(key=lambda x: (x["label"], x["name"]))

# 将数据集写入 JSON 文件，格式化输出便于查看
with open(output_json, "w", encoding="utf-8") as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"Dataset JSON 文件已创建：{output_json}")
