const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/components/profile/ProfilePersonalData.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = `          {/* Battle LIVE - shown above Open Battle when a battle is active */}
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

const replacementStr = `          {/* Battle LIVE Button */}
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

// Normalize CRLF to LF for matching
const normCode = code.replace(/\r\n/g, '\n');
const normTarget = targetStr.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, replacementStr);
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log('Successfully replaced Battle LIVE block!');
} else {
  console.log('Target block not found in normalized code');
}
