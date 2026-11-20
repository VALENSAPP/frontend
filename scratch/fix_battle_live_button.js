const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/profile/ProfilePersonalData.js');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Replace the Battle LIVE block
const oldBattleLiveBlockRegex = /{\/\* Battle LIVE - shown above Open Battle when a battle is active \*\/}[\s\S]*?<\/View>\s*<\/View>\s*<\/View>\s*<\/LinearGradient>\s*<\/TouchableOpacity>\s*<\/View>/;

const newBattleLiveBlock = `{/* Battle LIVE Button */}
          <View style={[styles.tabContainer, { height: 48, marginBottom: 6 }]}>
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
                <View style={styles.battleBtnInner}>
                  <Text style={styles.battleBtnText}>
                    {t('profilePersonData.battle', 'Battle') || 'Battle'}
                  </Text>
                  <View style={styles.liveBadge}>
                    <Animated.View
                      style={[
                        styles.liveBadgeDot,
                        { opacity: hasLiveBattle ? battleStatusPulseAnim : 1 },
                      ]}
                    />
                    <Text style={styles.liveBadgeText}>
                      {t('profilePersonData.live', 'LIVE') || 'LIVE'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>`;

if (oldBattleLiveBlockRegex.test(code)) {
  code = code.replace(oldBattleLiveBlockRegex, newBattleLiveBlock);
  console.log('Battle LIVE block updated');
} else {
  console.log('Battle LIVE block regex not matched');
}

// 2. Also ensure Open Battle container height is 48 marginBottom 6
code = code.replace(
  "{/* Open Battle / Invite to Battle */}\r\n          <View style={[styles.tabContainer, { height: 50 }]}>",
  "{/* Open Battle / Invite to Battle */}\r\n          <View style={[styles.tabContainer, { height: 48, marginBottom: 6 }]}>"
);
code = code.replace(
  "{/* Open Battle / Invite to Battle */}\n          <View style={[styles.tabContainer, { height: 50 }]}>",
  "{/* Open Battle / Invite to Battle */}\n          <View style={[styles.tabContainer, { height: 48, marginBottom: 6 }]}>"
);

// 3. Update battleBtnInner and liveBadge styles
if (!code.includes('battleBtnInner:')) {
  code = code.replace(
    "  servicesBtnInner: {",
    "  battleBtnInner: {\r\n    flexDirection: 'row',\r\n    alignItems: 'center',\r\n    justifyContent: 'center',\r\n  },\r\n  servicesBtnInner: {"
  );
}

// Update battleBtnText style for proper font size and weight
const oldBattleBtnTextRegex = /battleBtnText:\s*\{\s*color:\s*'#fff',\s*fontSize:\s*14,\s*fontWeight:\s*'500',/;
const newBattleBtnText = `battleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,`;

if (oldBattleBtnTextRegex.test(code)) {
  code = code.replace(oldBattleBtnTextRegex, newBattleBtnText);
  console.log('battleBtnText style updated');
} else {
  console.log('battleBtnText regex not matched');
}

// Ensure liveBadge has marginLeft: 8
const oldLiveBadgeRegex = /liveBadge:\s*\{\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*backgroundColor:\s*'rgba\(255,255,255,0\.22\)',\s*borderRadius:\s*999,\s*paddingHorizontal:\s*8,\s*paddingVertical:\s*2,\s*\},/;
const newLiveBadge = `liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },`;

if (oldLiveBadgeRegex.test(code)) {
  code = code.replace(oldLiveBadgeRegex, newLiveBadge);
  console.log('liveBadge style updated');
} else {
  console.log('liveBadge regex not matched');
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('ProfilePersonalData.js written');
