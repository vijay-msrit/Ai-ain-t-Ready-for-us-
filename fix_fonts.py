import os
import re
import math

scale = 1.35 # Inverse of 35% increase

updated_files = []

for root_dir, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root_dir, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            
            def replacer(match):
                prefix = match.group(1)
                size = int(match.group(2))
                suffix = match.group(3)
                new_size = math.ceil(size / scale)
                return f'{prefix}{new_size}{suffix}'
            
            new_content = re.sub(r'(fontSize:\s*[\'\"])(\d+)(px[^\'\"]*[\'\"])', replacer, content)
            
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                updated_files.append(filepath)

print('Updated files reversed:', updated_files)
