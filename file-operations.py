import os
import shutil

source_dir = r'D:\repos\ferco-posta\frontend\src\features\dashboard'
target_dir = r'D:\repos\ferco-posta\frontend\src\features\configuracion'

# 1. Create target directory
print(f'1. Creating directory: {target_dir}')
os.makedirs(target_dir, exist_ok=True)
print('   ✓ Directory created successfully')

# 2. Read and write Configuracion.jsx
js_source = os.path.join(source_dir, 'Configuracion.jsx')
js_target = os.path.join(target_dir, 'Configuracion.jsx')
print(f'\n2. Reading file: {js_source}')
with open(js_source, 'r', encoding='utf-8') as f:
    js_content = f.read()
print(f'   ✓ File read successfully ({len(js_content)} bytes)')

print(f'\n3. Writing to: {js_target}')
with open(js_target, 'w', encoding='utf-8') as f:
    f.write(js_content)
print('   ✓ File written successfully')

# 4. Read and write Configuracion.css
css_source = os.path.join(source_dir, 'Configuracion.css')
css_target = os.path.join(target_dir, 'Configuracion.css')
print(f'\n4. Reading file: {css_source}')
with open(css_source, 'r', encoding='utf-8') as f:
    css_content = f.read()
print(f'   ✓ File read successfully ({len(css_content)} bytes)')

print(f'\n5. Writing to: {css_target}')
with open(css_target, 'w', encoding='utf-8') as f:
    f.write(css_content)
print('   ✓ File written successfully')

# 6. Verify files exist
print('\n6. Verifying files exist:')
js_exists = os.path.exists(js_target)
css_exists = os.path.exists(css_target)
print(f'   Configuracion.jsx exists: {js_exists}')
print(f'   Configuracion.css exists: {css_exists}')

# List directory contents
print(f'\nDirectory contents of: {target_dir}')
files = os.listdir(target_dir)
for file in files:
    filepath = os.path.join(target_dir, file)
    size = os.path.getsize(filepath)
    print(f'   - {file} ({size} bytes)')

print('\n✓ All operations completed successfully!')
