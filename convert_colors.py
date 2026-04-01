import os
import re

color_map = {
    r'#0A0A0A': 'var(--bg-main)',
    r'#0a0a0a': 'var(--bg-main)',
    r'#1A1A1A': 'var(--bg-card)',
    r'#1a1a1a': 'var(--bg-card)',
    r'#141414': 'var(--bg-card)',
    r'#0F0F0F': 'var(--bg-sidebar)',
    r'#1E1E1E': 'var(--border-dark)',
    r'#2A2A2A': 'var(--border)',
    r'#252525': 'var(--border)',
    r'#ffffff': 'var(--text-main)',
    r'#FFFFFF': 'var(--text-main)',
    r'#fff': 'var(--text-main)',
    r'#FFF': 'var(--text-main)',
    r'#9ca3af': 'var(--text-muted)',
    r'#555555': 'var(--text-muted-dark)',
    r'#555': 'var(--text-muted-dark)',
    r'#444': 'var(--text-muted-dark)',
    r'#777': 'var(--text-muted-dark)',
    r'#aaa': 'var(--text-muted-light)',
    r'#ddd': 'var(--text-muted-light)',
    r'#FF8C00': 'var(--accent-yellow)',
    r'#ff8c00': 'var(--accent-yellow)',
    r'rgba\(255,\s*140,\s*0,\s*0\.([0-9]+)\)': r'rgba(var(--accent-yellow-rgb), 0.\1)',
    r'#4F46E5': 'var(--accent-blue)',
    r'#6366F1': 'var(--accent-blue)',
    r'#22C55E': 'var(--accent-green)',
    r'#EF4444': 'var(--accent-red)',
    r'rgba\(59,\s*130,\s*246,\s*0\.([0-9]+)\)': r'rgba(var(--accent-blue-rgb), 0.\1)',
    r'rgba\(99,\s*102,\s*241,\s*0\.([0-9]+)\)': r'rgba(var(--accent-blue-rgb), 0.\1)',
}

def replace_colors(content):
    for raw, css_var in color_map.items():
        if raw.startswith('rgba'):
             content = re.sub(raw, css_var, content, flags=re.IGNORECASE)
        else:
             content = re.sub(r'(?i)(' + raw + r')(?=[\'\";,} &)])', css_var, content)
    return content

updated = []
for root_dir, dirs, files in os.walk('frontend/src'):
    for file in files:
        if file.endswith('.jsx'):
            filepath = os.path.join(root_dir, file)
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            new_content = replace_colors(content)
            if new_content != content:
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                updated.append(filepath)

print('Updated files with css vars:', updated)
