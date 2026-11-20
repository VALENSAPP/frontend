const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/search/BattleExplore.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Add import for useBusinessProfileTheme if not present
if (!code.includes('useBusinessProfileTheme')) {
  code = code.replace(
    "import { useAppTheme } from '../../theme/useApptheme';",
    "import { useAppTheme } from '../../theme/useApptheme';\r\nimport { useBusinessProfileTheme } from '../../theme/useBusinessProfileTheme';"
  );
}

// 2. Update hook usage in BattleExplore component
const oldHookRegex = /const themeProfile = String\(profile \|\| ''\)\.toLowerCase\(\) === 'company' \? 'company' : undefined;\r?\n\s*const \{ bgStyle, text, card, border, mutedText, icon, accent \} = useAppTheme\(themeProfile\);/;
const newHook = `const { isBusinessProfile, bgStyle, text, card, border, mutedText, icon, accent } = useBusinessProfileTheme(profile);`;

if (oldHookRegex.test(code)) {
  code = code.replace(oldHookRegex, newHook);
  console.log('BattleExplore hook updated to useBusinessProfileTheme');
} else {
  console.log('BattleExplore hook regex not matched');
}

// 3. Update labelColor
const oldLabelColorRegex = /const labelColor = isDarkMode \? '#ffffff' : '#111827';/;
const newLabelColor = `const labelColor = isDarkMode ? '#ffffff' : (isBusinessProfile ? '#CBA257' : '#111827');`;
if (oldLabelColorRegex.test(code)) {
  code = code.replace(oldLabelColorRegex, newLabelColor);
  console.log('BattleExplore labelColor updated');
} else {
  console.log('BattleExplore labelColor regex not matched');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('BattleExplore.js updated');
