const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/profile/ProfilePersonalData.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update profileActionGradient
const oldGradRegex = /const profileActionGradient = profileThemeIsCompany\s*\?\s*\[accent,\s*accent\]\s*:\s*\['#4A249D',\s*'#402090'\];/;
const newGrad = `const profileActionGradient = profileThemeIsCompany
    ? ['#CBA257', '#9E7429']
    : ['#4A249D', '#402090'];`;

if (oldGradRegex.test(code)) {
  code = code.replace(oldGradRegex, newGrad);
  console.log('profileActionGradient updated');
} else {
  console.log('profileActionGradient regex not matched');
}

// 2. Update Battle LIVE button to wrap in LinearGradient
const oldBattleLiveRegex = /{\/\* Battle LIVE[^\n]*\*\/}\s*<View style=\{\[styles\.tabContainer, \{ marginBottom: -8, height: 50 \}\]\}>\s*<TouchableOpacity\s*style=\{\[styles\.tab, \{ backgroundColor: accent, borderColor: accent \}\]\}\s*onPress=\{handleBattleTabPress\}\s*>\s*<View style=\{styles\.tabContentRow\}>[\s\S]*?<\/View>\s*<\/TouchableOpacity>\s*<\/View>/;

const newBattleLive = `{/* Battle LIVE - shown above Open Battle when a battle is active */}
          <View style={[styles.tabContainer, { marginBottom: -8, height: 50 }]}>
            <TouchableOpacity
              style={[styles.battleBtnWrapper, { backgroundColor: accent, borderColor: accent }]}
              onPress={handleBattleTabPress}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={profileActionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.battleBtn}
              >
                <View style={styles.tabContentRow}>
                  <Text style={[styles.tabText, styles.activeTabText, { color: '#fff' }]}>
                    {t('profilePersonData.battle')}
                  </Text>
                  {hasLiveBattle && (
                    <View style={styles.liveBadge}>
                      <Animated.View
                        style={[styles.liveBadgeDot, { opacity: battleStatusPulseAnim }]}
                      />
                      <Text style={styles.liveBadgeText}>{t('profilePersonData.live')}</Text>
                    </View>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>`;

if (oldBattleLiveRegex.test(code)) {
  code = code.replace(oldBattleLiveRegex, newBattleLive);
  console.log('Battle LIVE button updated');
} else {
  console.log('Battle LIVE regex not matched');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('ProfilePersonalData.js written');
