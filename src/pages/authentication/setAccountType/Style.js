import { StyleSheet, Platform } from "react-native";
import { useAppTheme } from "../../../theme/useApptheme";

const createStyles = () => {
    const { bg, text, card, border, mutedText, accent } = useAppTheme();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: bg,
            overflow: "hidden",
        },
        backgroundContainer: {
            ...StyleSheet.absoluteFillObject,
            overflow: "hidden",
        },
        bgShape1: {
            position: "absolute",
            width: 300,
            height: 300,
            borderRadius: 150,
            opacity: 0.1,
        },
        bgShape2: {
            position: "absolute",
            width: 250,
            height: 250,
            borderRadius: 125,
            opacity: 0.08,
        },
        bgShape3: {
            position: "absolute",
            width: 200,
            height: 400,
            opacity: 0.06,
        },
        contentContainer: {
            flex: 1,
            ppaddingTop: Platform.OS === 'ios' ? 0 : 30,
            zIndex: 1,
        },
        header: {
            paddingTop: 20,
            paddingBottom: 40,
            alignItems: "center",
        },
        topIcon: {
            position: "absolute",
            left: 16,
            top: 10,
            backgroundColor: card,
            padding: 8,
            borderRadius: 10,
        },
        title: {
            fontSize: 26,
            fontWeight: "700",
            color: accent,
            marginTop: 10,
        },
        subtitle: {
            fontSize: 14,
            color: mutedText,
            marginTop: 5,
        },
        cardsContainer: {
            flexDirection: "row",
            justifyContent: "space-between",
            marginHorizontal: 8,
            marginTop: 16,
            marginBottom: 24,
        },
        card: {
            flex: 1,
            backgroundColor: card,
            marginHorizontal: 4,
            borderRadius: 22,
            paddingHorizontal: 12,
            paddingVertical: 16,
            elevation: 6,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 10,
            flexDirection: "column",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: border,
        },
        cardAnimated: {
            backgroundColor: card,
            borderRadius: 20,
            overflow: "hidden",
        },
        cardGradientBorder: {
            padding: 1,
            borderRadius: 20,
        },
        iconCircle: {
            width: 46,
            height: 46,
            borderRadius: 23,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
        },
        iconCirclePurple: {
            backgroundColor: `${accent}1E`,
            alignSelf: "center",
        },
        iconCircleGold: {
            backgroundColor: "#FEF3C7",
            alignSelf: "center",
        },
        cardTitlePurple: {
            textAlign: "center",
            marginTop: 10,
            fontWeight: "800",
            color: accent,
            fontSize: 16,
        },
        cardTitleGold: {
            textAlign: "center",
            marginTop: 10,
            fontWeight: "800",
            color: "#B45309",
            fontSize: 16,
        },
        cardDesc: {
            textAlign: "center",
            fontSize: 11.5,
            lineHeight: 15,
            color: mutedText,
            marginTop: 4,
            marginBottom: 14,
            paddingHorizontal: 2,
        },
        featuresList: {
            marginTop: 2,
        },
        listItem: {
            flexDirection: "row",
            alignItems: "flex-start",
            marginBottom: 10,
        },
        listIconWrap: {
            width: 20,
            alignItems: "center",
            paddingTop: 1.5,
        },
        listTextWrap: {
            flex: 1,
            marginLeft: 7,
        },
        listTitle: {
            fontSize: 12,
            fontWeight: "700",
            color: text,
            lineHeight: 16,
        },
        listSubtitle: {
            fontSize: 10,
            fontWeight: "400",
            color: mutedText,
            marginTop: 1.5,
            lineHeight: 13,
        },
        purpleBtn: {
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 6,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: `${accent}1E`,
            borderWidth: 1.5,
            borderColor: accent,
            overflow: "hidden",
        },

        purpleBtnText: {
            color: accent,
            fontWeight: "700",
            textAlign: "center",
            fontSize: 13,
        },

        goldBtn: {
            marginTop: 16,
            paddingVertical: 12,
            paddingHorizontal: 6,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(211, 182, 131, 0.16)",
            borderWidth: 1.5,
            borderColor: "#C9A15A",
            overflow: "hidden",
        },

        goldBtnText: {
            color: "#B45309",
            fontWeight: "700",
            textAlign: "center",
            fontSize: 13,
        },
    });

    return styles;
};

export default createStyles;
