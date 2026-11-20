const fs = require('fs');
const path = require('path');

// -------------------------------------------------------------
// 1. UPDATE Battlecard.js
// -------------------------------------------------------------
const battleCardPath = path.resolve('src/components/search/Battlecard.js');
let battleCard = fs.readFileSync(battleCardPath, 'utf8').replace(/\r\n/g, '\n');

// Update useBattleAccent to ensure isBusiness is properly exported
const oldAccentBlock = `    return {
        accent: brandAccent,
        accentLight,
        accentDark: brandAccent,
        accentSoftText,
        isDarkMode,
        card: brandCard,
        border: brandBorder,
        text: brandAccent,
        mutedText: isDarkMode ? '#A59DB5' : (isBusinessProfile ? '#8C8270' : (mutedText || '#7A7289')),
        isBusinessProfile,
        background: isDarkMode ? '#121212' : (isBusinessProfile ? '#FAF7F0' : (screenBackground || '#FAF7FD')),
    };`;

// Update OptionChip to support Option Letters (A, B, C, D) and Image Card with overlay as in Image 2
const oldOptionChipRegex = /const OptionChip = \(\{[\s\S]*?return \([\s\S]*?<\/TouchableOpacity>\s*\);\s*\};/;

const newOptionChip = `const OptionChip = ({
    option,
    index = 0,
    isSelected,
    onPress,
    disabled,
    avatarUrl,
    imageUrl,
    teamLogoUrl,
    percent,
    onImagePress,
}) => {
    const { accent, border, mutedText, isDarkMode, isBusinessProfile } = useBattleAccent();
    const safePercent = Number.isFinite(percent)
        ? Math.max(0, Math.min(100, Math.round(percent)))
        : 0;
    const label = option?.label || option;
    const optionLetter = String.fromCharCode(65 + (index % 26));

    const resolvedImage = normalizeImageUrl(
        imageUrl || option?.image || option?.imageUrl || option?.picture || (avatarUrl !== DEFAULT_AVATAR ? avatarUrl : null)
    );

    const handleImagePress = (e) => {
        e?.stopPropagation?.();
        if (resolvedImage) {
            onImagePress?.(resolvedImage, label);
        }
    };

    // --- CASE 1: OPTION WITH IMAGE (Landscape card with bottom overlay) ---
    if (resolvedImage) {
        return (
            <TouchableOpacity
                activeOpacity={0.88}
                disabled={disabled}
                onPress={onPress}
                style={[
                    styles.optionImageCard,
                    {
                        borderColor: isSelected
                            ? (isDarkMode ? '#C084FC' : (isBusinessProfile ? '#B88728' : accent))
                            : (isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : border)),
                        borderWidth: isSelected ? 2 : 1,
                    },
                    disabled && styles.optionDisabled,
                ]}
            >
                <View style={styles.optionLandscapeImageWrap}>
                    <Image
                        source={{ uri: resolvedImage }}
                        style={styles.optionLandscapeImage}
                        resizeMode="cover"
                    />
                    <View style={styles.optionImageOverlay}>
                        <View style={[styles.letterPill, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}>
                            <Text style={styles.letterPillText}>{optionLetter}</Text>
                        </View>
                        <Text style={styles.optionOverlayLabel} numberOfLines={1}>
                            {label}
                        </Text>
                    </View>
                </View>

                {/* Percentage & Progress Bar below Image */}
                <View style={styles.optionImageBottomWrap}>
                    <Text style={[styles.optionBottomPercent, { color: isBusinessProfile ? '#5C3E08' : (isDarkMode ? '#EDE7F6' : accent) }]}>
                        {safePercent}%
                    </Text>
                    <View style={[styles.optionProgressTrack, { backgroundColor: isDarkMode ? '#352B44' : (isBusinessProfile ? '#EDE6D6' : '#FAF7F0') }]}>
                        <View
                            style={[
                                styles.optionProgressFill,
                                {
                                    width: \`\${safePercent}%\`,
                                    backgroundColor: isDarkMode ? '#A855F7' : (isBusinessProfile ? '#B88728' : accent),
                                },
                            ]}
                        />
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    // --- CASE 2: OPTION WITHOUT IMAGE (Card with Letter Pill, Title, Percent, Progress Bar) ---
    return (
        <TouchableOpacity
            activeOpacity={0.88}
            disabled={disabled}
            onPress={onPress}
            style={[
                styles.optionChip,
                {
                    backgroundColor: isDarkMode ? '#241D30' : (isBusinessProfile ? '#FDFCF9' : '#FFFFFF'),
                    borderColor: isSelected
                        ? (isDarkMode ? '#C084FC' : (isBusinessProfile ? '#B88728' : accent))
                        : (isDarkMode ? '#382A4C' : (isBusinessProfile ? '#E8D9BD' : border)),
                    borderWidth: isSelected ? 1.5 : 1,
                },
                disabled && styles.optionDisabled,
            ]}
        >
            <View style={styles.optionContentRow}>
                {/* Letter Pill */}
                <View style={[styles.letterPill, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}>
                    <Text style={styles.letterPillText}>{optionLetter}</Text>
                </View>

                {/* Label */}
                <View style={styles.optionTextContainer}>
                    <Text
                        style={[
                            styles.optionChipLabel,
                            { color: isSelected ? (isDarkMode ? '#F5F0FF' : accent) : (isBusinessProfile ? '#5C3E08' : labelColor) },
                        ]}
                        numberOfLines={1}
                    >
                        {label}
                    </Text>
                </View>

                {/* Percent */}
                <Text
                    style={[
                        styles.optionPercentInline,
                        { color: isSelected ? (isDarkMode ? '#C084FC' : accent) : (isBusinessProfile ? '#5C3E08' : mutedText) },
                    ]}
                >
                    {safePercent}%
                </Text>
            </View>

            {/* Progress Bar at Bottom */}
            <View
                style={[
                    styles.optionProgressTrack,
                    { backgroundColor: isDarkMode ? '#352B44' : (isBusinessProfile ? '#EDE6D6' : '#FAF7F0') },
                ]}
            >
                <View
                    style={[
                        styles.optionProgressFill,
                        {
                            width: \`\${safePercent}%\`,
                            backgroundColor: isDarkMode ? '#A855F7' : (isBusinessProfile ? '#B88728' : accent),
                        },
                    ]}
                />
            </View>
        </TouchableOpacity>
    );
};`;

if (oldOptionChipRegex.test(battleCard)) {
    battleCard = battleCard.replace(oldOptionChipRegex, newOptionChip);
    console.log('OptionChip updated to support Image 2 mockup');
} else {
    console.log('OptionChip regex failed');
}

// Update OptionChip call sites to pass index
battleCard = battleCard.replace(
    /\{item\.options\.slice\(0, 4\)\.map\(\(option, idx\) => \{/g,
    '{item.options.slice(0, 4).map((option, idx) => {\n                                const optionIndex = idx;'
);
battleCard = battleCard.replace(
    /<OptionChip\s+key=\{`\$\{item\.id\}-\$\{option\?\.id \|\| label\}`\}\s+option=\{option\}/g,
    '<OptionChip\n                                        key={`${item.id}-${option?.id || label}`}\n                                        option={option}\n                                        index={idx}'
);

// Update Poll Header and Footer
const oldPollCardBodyRegex = /{\/\* Top Creator Row \*\/}[\s\S]*?{\/\* Participants & Comments centered below \*\/}[\s\S]*?<\/View>\s*<\/View>/;

const newPollCardBody = `{/* Top Creator Row with inline timer as in mockup */}
                    <View style={styles.cardTopRow}>
                        <View style={styles.pollCreatorRowContainer}>
                            <HexAvatar
                                uri={normalizeImageUrl(item.creator?.avatar) || DEFAULT_AVATAR}
                                size={36}
                                borderWidth={2}
                                borderColor={isBusinessProfile ? '#B88728' : accent}
                                fadeDuration={0}
                            />
                            <View style={styles.pollCreatorTextWrap}>
                                <View style={styles.pollCreatorNameRow}>
                                    <Text style={[styles.pollCreatorName, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#5C3E08' : '#402090') }]} numberOfLines={1}>
                                        {item.creator?.name || t('battleCard.creator', 'Creator')}
                                    </Text>
                                    <Text style={styles.swordsBadge}>⚔️</Text>
                                </View>
                                <View style={styles.pollCreatorSubRow}>
                                    <Text style={[styles.pollCreatorHandle, { color: isBusinessProfile ? '#8C7A55' : mutedText }]} numberOfLines={1}>
                                        @{item.creator?.userName || 'user'}
                                    </Text>
                                    {!!item.endTime && (
                                        <>
                                            <Text style={[styles.pollDot, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}> • </Text>
                                            <Icon name="time-outline" size={10} color={isBusinessProfile ? '#8C7A55' : mutedText} style={{ marginRight: 2 }} />
                                            <Text style={[styles.pollTimerText, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}>
                                                {formatBattleCountdown(item.endTime, t)}
                                            </Text>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                        <ModeBadge
                            format={item.raw?.battleType === 'PREDICTION' ? 'PREDICTION' : 'POLL'}
                            ended={ended}
                            isLive={item.isLive}
                            t={t}
                        />
                    </View>

                    {/* Question / Title */}
                    <Text style={[styles.question, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#5C3E08' : '#402090') }]} numberOfLines={3}>
                        {item.title}
                    </Text>

                    {/* Options Side-by-Side */}
                    {item.options?.length > 0 && (
                        <View style={styles.pollOptions}>
                            {item.options.slice(0, 4).map((option, idx) => {
                                const optionImageUrl = optionImages[idx];
                                const label = option?.label || option;
                                const isSelected = selectedOption === label;
                                return (
                                    <OptionChip
                                        key={\`\${item.id}-\${option?.id || label}\`}
                                        option={option}
                                        index={idx}
                                        isSelected={isSelected}
                                        disabled={ended}
                                        imageUrl={optionImageUrl || option?.image || option?.imageUrl}
                                        avatarUrl={optionImageUrl || option?.image || DEFAULT_AVATAR}
                                        teamLogoUrl={getTeamLogoForOption(option)}
                                        onPress={() => handleOption(label)}
                                        onImagePress={(url, title) => setEnlargedImage({ url, title })}
                                        percent={optionPercents[idx]}
                                    />
                                );
                            })}
                        </View>
                    )}

                    {/* Card Footer matching Image 2 mockup */}
                    <View style={styles.pollFooterRow}>
                        {/* Stakes Pill */}
                        <View style={[styles.footerStakePill, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : (isBusinessProfile ? '#FBF8F0' : accentLight) }]}>
                            <Icon name="flash" size={11} color={isBusinessProfile ? '#8C6010' : accent} style={{ marginRight: 4 }} />
                            <Text style={[styles.footerStakeText, { color: isBusinessProfile ? '#8C6010' : accent }]}>
                                {t('battleCard.stakes', 'Stakes')}: <Text style={[styles.footerStakeAmount, { color: isBusinessProfile ? '#8C6010' : accent }]}>{formatAmount(item.stakeAmount || 0)}</Text>
                            </Text>
                        </View>

                        {/* Participants & Comments inline */}
                        <View style={styles.footerStatsRowInline}>
                            <View style={styles.footerStatItem}>
                                <Icon name="people-outline" size={14} color={isBusinessProfile ? '#8C7A55' : mutedText} />
                                <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C7A55' : '#402090') }]}>
                                    {formatBattleCount(item.totalParticipants || 0)}
                                </Text>
                            </View>
                            <Text style={[styles.footerDot, { color: isBusinessProfile ? '#8C7A55' : mutedText }]}>•</Text>
                            <View style={styles.footerStatItem}>
                                <Icon name="chatbubble-outline" size={12} color={isBusinessProfile ? '#8C7A55' : mutedText} />
                                <Text style={[styles.footerStatText, { color: isDarkMode ? '#EDE7F6' : (isBusinessProfile ? '#8C7A55' : '#402090') }]}>
                                    {formatBattleCount(item.totalComments || 0)}
                                </Text>
                            </View>
                        </View>

                        {/* Vote Now ➔ Button */}
                        <TouchableOpacity
                            style={[styles.voteNowBtn, { backgroundColor: isBusinessProfile ? '#B88728' : accent }]}
                            onPress={() => onCardPress(item)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.voteNowBtnText}>Vote Now ➔</Text>
                        </TouchableOpacity>
                    </View>`;

if (oldPollCardBodyRegex.test(battleCard)) {
    battleCard = battleCard.replace(oldPollCardBodyRegex, newPollCardBody);
    console.log('Poll card body replaced with Image 2 mockup layout');
} else {
    console.log('Poll card body regex failed');
}

// Add Styles for Option Image Card, Overlay, Letter Pill, and Footer
const newStylesStr = `
    optionImageCard: {
        flex: 1,
        minWidth: 120,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        marginBottom: 4,
    },
    optionLandscapeImageWrap: {
        width: '100%',
        height: 90,
        position: 'relative',
        backgroundColor: '#EDE8F5',
    },
    optionLandscapeImage: {
        width: '100%',
        height: '100%',
    },
    optionImageOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.48)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        gap: 6,
    },
    optionOverlayLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        flex: 1,
    },
    optionImageBottomWrap: {
        paddingHorizontal: 8,
        paddingVertical: 6,
    },
    optionBottomPercent: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 3,
    },
    letterPill: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 6,
    },
    letterPillText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
    },
    pollCreatorSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    pollDot: {
        fontSize: 11,
    },
    pollTimerText: {
        fontSize: 11,
        fontWeight: '500',
    },
    footerStatsRowInline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    voteNowBtn: {
        borderRadius: 20,
        paddingHorizontal: 13,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    voteNowBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
`;

battleCard = battleCard.replace('const styles = StyleSheet.create({', 'const styles = StyleSheet.create({' + newStylesStr);

fs.writeFileSync(battleCardPath, battleCard, 'utf8');
console.log('Battlecard.js successfully updated for Image 2 mockup');
