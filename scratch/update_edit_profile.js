const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/profile/editprofile/index.js');
let code = fs.readFileSync(filePath, 'utf8');

const oldLayoutEffectRegex = /useLayoutEffect\(\(\) => \{\s*navigation\.setOptions\(\{[\s\S]*?headerLeft:[\s\S]*?\}\);\s*\}, \[navigation, loading, isFormValid, handleSaveAll, returnTo, returnScreen, icon, accent, t\]\);/;

const newLayoutEffect = `useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('profileEdit.title', 'Edit Profile'),
      headerTitleStyle: { color: accent, fontWeight: '700' },
      headerStyle: { backgroundColor: bgStyle?.backgroundColor || '#FAF7F0', elevation: 0, shadowOpacity: 0 },
      headerTintColor: accent,
      headerLeft: () => (
        <TouchableOpacity
          onPress={handleBack}
          style={{ marginLeft: 15 }}
        >
          <Icon name="arrow-left" size={24} color={icon} />
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity
          onPress={handleSaveAll}
          style={[
            styles.headerButton,
            { opacity: (loading || !isFormValid()) ? 0.5 : 1 }
          ]}
          disabled={loading || !isFormValid()}
        >
          {loading ? (
            <ActivityIndicator size="small" color={accent} />
          ) : (
            <Text style={[styles.headerButtonText, { color: accent }]}>{t('profileEdit.saveButton')}</Text>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, loading, isFormValid, handleSaveAll, returnTo, returnScreen, icon, accent, t, bgStyle]);`;

if (oldLayoutEffectRegex.test(code)) {
  code = code.replace(oldLayoutEffectRegex, newLayoutEffect);
  console.log('ProfileEditScreen useLayoutEffect updated');
} else {
  console.log('ProfileEditScreen useLayoutEffect regex not matched');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('ProfileEditScreen updated');
