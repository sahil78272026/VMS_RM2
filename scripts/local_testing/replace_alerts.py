import os
import re

files_to_check = [
    'mobile/src/screens/admin/index.tsx',
    'mobile/src/screens/admin/SuperAdminScreen.tsx',
    'mobile/src/screens/auth/index.tsx',
    'mobile/src/screens/guard/index.tsx',
    'mobile/src/screens/resident/index.tsx'
]

def replace_alerts(filepath):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()

    # Add Toast import if not exists
    if 'react-native-toast-message' not in content:
        content = content.replace("from 'react-native';", "from 'react-native';\nimport Toast from 'react-native-toast-message';")

    # Replace simple Alert.alert('Success', 'Message') -> Toast.show({ type: 'success', text1: 'Success', text2: 'Message' })
    # We'll use a regex that matches exactly 2 arguments for Alert.alert
    
    def replacer(match):
        title = match.group(1)
        msg = match.group(2)
        
        # Don't replace if it's the 3-argument version (has buttons) - our regex only captures if there's no third arg
        # But wait, python regex might be tricky if msg has commas.
        return match.group(0)

    # Let's just do targeted string replacements for known patterns to be safe
    # Regex for Alert.alert( arg1, arg2 )
    pattern = r"Alert\.alert\(\s*('[^']+'|\"[^\"]+\")\s*,\s*([^,]+?)\s*\)"
    
    def regex_replacer(match):
        title_raw = match.group(1)
        msg_raw = match.group(2)
        title = title_raw.strip("'\"")
        
        t_type = 'error'
        if 'success' in title.lower() or 'verified' in title.lower() or 'approved' in title.lower() or 'activated' in title.lower() or 'deleted' in title.lower():
            t_type = 'success'
            
        return f"Toast.show({{ type: '{t_type}', text1: {title_raw}, text2: {msg_raw} }})"

    new_content = re.sub(pattern, regex_replacer, content)
    
    with open(filepath, 'w') as f:
        f.write(new_content)
        
for file in files_to_check:
    replace_alerts(file)
print("Alerts replaced.")
