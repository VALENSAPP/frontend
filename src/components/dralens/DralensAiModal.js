import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeContext } from '../../theme/ThemeContext';
import { askDralensAi, getDralensWelcome } from '../../services/dralens/dralensService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const QUICK_PROMPTS = [
  {
    id: 'mission',
    icon: 'sparkles',
    iconType: 'Ionicons',
    text: 'How do I post a Mission?',
  },
  {
    id: 'closet',
    icon: 'shopping-bag',
    iconType: 'Feather',
    text: 'How do I sell an item in My Closet?',
  },
  {
    id: 'service',
    icon: 'briefcase',
    iconType: 'Feather',
    text: 'How do I create a Service?',
  },
  {
    id: 'color',
    icon: 'users',
    iconType: 'Feather',
    text: 'How do I invite friends to Color Together?',
  },
];

export default function DralensAiModal() {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState('welcome'); // 'welcome' | 'chat'
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickPromptsList, setQuickPromptsList] = useState(QUICK_PROMPTS);
  const { isDarkMode } = useThemeContext();
  const scrollViewRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      role: 'assistant',
      intro:
        "Hi! I'm Dralens 👋\nAsk me anything about Valens.\nI can help you with features, payments, services, marketplace, settings and more.",
      time: getCurrentTime(),
    },
  ]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('OPEN_DRALENS_AI', () => {
      setVisible(true);

      // Fetch live welcome & suggestions from backend: GET /api/v1/dralens-chat/welcome
      getDralensWelcome().then((data) => {
        if (!data) return;
        if (data.message) {
          setMessages((prev) => {
            if (prev.length === 1 && prev[0].id === 'welcome_1') {
              return [{ ...prev[0], intro: data.message }];
            }
            return prev;
          });
        }
        if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const formatted = data.suggestions.map((item, idx) => {
            if (typeof item === 'string') {
              return {
                id: `suggestion_${idx}`,
                icon: idx % 2 === 0 ? 'sparkles' : 'arrow-right',
                iconType: idx % 2 === 0 ? 'Ionicons' : 'Feather',
                text: item,
              };
            }
            return {
              id: item.id || `suggestion_${idx}`,
              icon: item.icon || 'sparkles',
              iconType: item.iconType || 'Ionicons',
              text: item.text || item.question || item.title || '',
            };
          });
          setQuickPromptsList(formatted);
        }
      });
    });
    return () => sub.remove();
  }, []);

  function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  const handleClose = () => {
    setVisible(false);
  };

  const handleSend = async (messageToSend) => {
    const query = (messageToSend || inputText).trim();
    if (!query) return;

    setInputText('');
    setMode('chat');

    const userMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      text: query,
      time: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await askDralensAi(query, messages);
      const botMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        intro: response.intro,
        steps: response.steps,
        outro: response.outro,
        time: getCurrentTime(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot_err_${Date.now()}`,
          role: 'assistant',
          intro: "I'm having a little trouble connecting right now, but please check your network or try asking again in a moment!",
          time: getCurrentTime(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  const colors = {
    bg: isDarkMode ? '#171120' : '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.45)',
    card: isDarkMode ? '#221930' : '#FFFFFF',
    cardBorder: isDarkMode ? '#392C4D' : '#F1E8FD',
    chipBg: isDarkMode ? '#241838' : '#FAF5FF',
    chipBorder: isDarkMode ? '#4C3575' : '#E9D5FF',
    text: isDarkMode ? '#FFFFFF' : '#111827',
    subText: isDarkMode ? '#A78BFA' : '#6B7280',
    primary: '#7C3AED',
    primaryDark: '#6D28D9',
    userBubble: '#6D28D9',
    botBubble: isDarkMode ? '#281E3B' : '#F4F4F6',
    stepCardBg: isDarkMode ? '#1E162B' : '#FBF9FE',
    stepCardBorder: isDarkMode ? '#3B2D54' : '#EDE4F9',
    inputBg: isDarkMode ? '#221930' : '#FFFFFF',
    inputBorder: isDarkMode ? '#3F3158' : '#E5E7EB',
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: colors.bg,
                height: mode === 'chat' ? SCREEN_HEIGHT * 0.88 : undefined,
                maxHeight: SCREEN_HEIGHT * 0.92,
              },
            ]}
          >
            {/* Top Drag Handle */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.dragHandle} />
            </View>

            {/* Top Close Button */}
            <TouchableOpacity
              onPress={handleClose}
              style={[
                styles.closeButton,
                { backgroundColor: isDarkMode ? '#2E2242' : '#F3F4F6' },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name="close"
                size={20}
                color={isDarkMode ? '#E9D5FF' : '#374151'}
              />
            </TouchableOpacity>

            {/* MODE 1: WELCOME & QUICK PROMPTS (Screen 2) */}
            {mode === 'welcome' && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.welcomeScrollContent}
              >
                {/* 3D Mascot Header */}
                <View style={styles.mascotWrapper}>
                  <Image
                    source={require('../../assets/icons/pngicons/dralens_mascot.png')}
                    style={styles.mascotImage}
                    resizeMode="contain"
                  />
                  <View style={styles.titleRow}>
                    <Text style={[styles.welcomeGreeting, { color: colors.text }]}>
                      Hi, I'm <Text style={styles.gradientDralens}>Dralens</Text>
                    </Text>
                  </View>
                  <Text style={[styles.welcomeSubtitle, { color: colors.text }]}>
                    Ask me anything?
                  </Text>
                </View>

                {/* Quick Prompts List */}
                <View style={styles.quickPromptsList}>
                  {quickPromptsList.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      style={[
                        styles.quickPromptCard,
                        {
                          backgroundColor: colors.chipBg,
                          borderColor: colors.chipBorder,
                        },
                      ]}
                      onPress={() => handleSend(item.text)}
                    >
                      <View style={styles.quickPromptLeft}>
                        {item.iconType === 'Ionicons' ? (
                          <Ionicons
                            name={item.icon}
                            size={18}
                            color={colors.primary}
                            style={{ marginRight: 12 }}
                          />
                        ) : (
                          <Feather
                            name={item.icon}
                            size={17}
                            color={colors.primary}
                            style={{ marginRight: 12 }}
                          />
                        )}
                        <Text
                          style={[
                            styles.quickPromptText,
                            { color: colors.text },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </View>
                      <Feather
                        name="arrow-right"
                        size={17}
                        color={colors.subText}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Bottom Input (Welcome State) */}
                <View style={styles.inputContainerWelcome}>
                  <View
                    style={[
                      styles.inputPill,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={18}
                      color={colors.primary}
                      style={{ marginRight: 8, marginLeft: 2 }}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Type your question..."
                      placeholderTextColor={colors.subText}
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      onPress={() => handleSend()}
                      activeOpacity={0.8}
                      style={[
                        styles.sendButtonCircle,
                        { backgroundColor: colors.primaryDark },
                      ]}
                    >
                      <Feather name="arrow-up-right" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            )}

            {/* MODE 2: ACTIVE CHAT CONVERSATION (Screen 3) */}
            {mode === 'chat' && (
              <View style={styles.chatWrapper}>
                {/* Chat Header */}
                <View
                  style={[
                    styles.chatHeader,
                    { borderBottomColor: isDarkMode ? '#2D2142' : '#F3F4F6' },
                  ]}
                >
                  <View style={styles.chatHeaderProfile}>
                    <Image
                      source={require('../../assets/icons/pngicons/dralens_avatar.png')}
                      style={styles.chatHeaderAvatar}
                      resizeMode="contain"
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text
                        style={[
                          styles.chatHeaderTitle,
                          { color: colors.text },
                        ]}
                      >
                        Dralens AI
                      </Text>
                      <View style={styles.onlineRow}>
                        <View style={styles.onlineDot} />
                        <Text style={styles.onlineText}>Online</Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setMode('welcome')}
                    style={styles.backToWelcomeBtn}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600' }}>
                      Topics
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Chat Messages */}
                <ScrollView
                  ref={scrollViewRef}
                  style={styles.messagesScroll}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                >
                  {messages.map((msg) => (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        msg.role === 'user'
                          ? styles.messageRowUser
                          : styles.messageRowBot,
                      ]}
                    >
                      {msg.role === 'assistant' && (
                        <Image
                          source={require('../../assets/icons/pngicons/dralens_avatar.png')}
                          style={styles.botAvatar}
                          resizeMode="contain"
                        />
                      )}

                      <View
                        style={[
                          styles.bubbleBase,
                          msg.role === 'user'
                            ? [
                                styles.userBubble,
                                { backgroundColor: colors.userBubble },
                              ]
                            : [
                                styles.botBubble,
                                { backgroundColor: colors.botBubble },
                              ],
                        ]}
                      >
                        {/* Message Text */}
                        <Text
                          style={[
                            styles.bubbleText,
                            {
                              color:
                                msg.role === 'user' ? '#FFFFFF' : colors.text,
                            },
                          ]}
                        >
                          {msg.role === 'user' ? msg.text : msg.intro}
                        </Text>

                        {/* Numbered Steps Card (if steps exist) */}
                        {msg.steps && msg.steps.length > 0 && (
                          <View
                            style={[
                              styles.stepCardContainer,
                              {
                                backgroundColor: colors.stepCardBg,
                                borderColor: colors.stepCardBorder,
                              },
                            ]}
                          >
                            {msg.steps.map((step, idx) => (
                              <View key={idx} style={styles.stepItemRow}>
                                <View
                                  style={[
                                    styles.stepNumberBadge,
                                    { backgroundColor: colors.primaryDark },
                                  ]}
                                >
                                  <Text style={styles.stepNumberText}>
                                    {idx + 1}
                                  </Text>
                                </View>
                                <Text
                                  style={[
                                    styles.stepItemText,
                                    { color: colors.text },
                                  ]}
                                >
                                  {step}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}

                        {/* Outro text if any */}
                        {msg.outro && (
                          <Text
                            style={[
                              styles.bubbleOutroText,
                              { color: colors.text },
                            ]}
                          >
                            {msg.outro}
                          </Text>
                        )}

                        {/* Timestamp & read receipt */}
                        <View style={styles.timestampRow}>
                          <Text
                            style={[
                              styles.timestampText,
                              {
                                color:
                                  msg.role === 'user'
                                    ? '#E9D5FF'
                                    : colors.subText,
                              },
                            ]}
                          >
                            {msg.time}
                          </Text>
                          {msg.role === 'user' && (
                            <Text style={styles.readReceipt}> ✓✓</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}

                  {/* Typing Indicator */}
                  {isLoading && (
                    <View style={[styles.messageRow, styles.messageRowBot]}>
                      <Image
                        source={require('../../assets/icons/pngicons/dralens_avatar.png')}
                        style={styles.botAvatar}
                        resizeMode="contain"
                      />
                      <View
                        style={[
                          styles.botBubble,
                          styles.typingBubble,
                          { backgroundColor: colors.botBubble },
                        ]}
                      >
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.typingText,
                            { color: colors.subText },
                          ]}
                        >
                          Dralens is writing...
                        </Text>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Bottom Input (Chat State) */}
                <View style={styles.inputContainerChat}>
                  <View
                    style={[
                      styles.inputPill,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="sparkles"
                      size={18}
                      color={colors.primary}
                      style={{ marginRight: 8, marginLeft: 2 }}
                    />
                    <TextInput
                      style={[styles.textInput, { color: colors.text }]}
                      placeholder="Type your message..."
                      placeholderTextColor={colors.subText}
                      value={inputText}
                      onChangeText={setInputText}
                      onSubmitEditing={() => handleSend()}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      onPress={() => handleSend()}
                      activeOpacity={0.8}
                      style={[
                        styles.sendButtonCircle,
                        { backgroundColor: colors.primaryDark },
                      ]}
                    >
                      <Feather name="arrow-up-right" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  dragHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  closeButton: {
    position: 'absolute',
    top: 14,
    right: 18,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  welcomeScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  mascotWrapper: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  mascotImage: {
    width: 175,
    height: 108,
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeGreeting: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  gradientDralens: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  welcomeSubtitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 3,
    textAlign: 'center',
  },
  quickPromptsList: {
    marginTop: 10,
    marginBottom: 18,
  },
  quickPromptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  quickPromptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  quickPromptText: {
    fontSize: 14.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  inputContainerWelcome: {
    marginTop: 4,
    marginBottom: 8,
  },
  inputContainerChat: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 30,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 5,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    paddingVertical: 6,
  },
  sendButtonCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  chatWrapper: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chatHeaderProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chatHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  onlineText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  backToWelcomeBtn: {
    marginRight: 40,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    marginTop: 2,
  },
  bubbleBase: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  botBubble: {
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  stepCardContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  stepItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4.5,
  },
  stepNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepItemText: {
    fontSize: 13.5,
    lineHeight: 19,
    flex: 1,
  },
  bubbleOutroText: {
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 8,
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  timestampText: {
    fontSize: 11,
  },
  readReceipt: {
    color: '#E9D5FF',
    fontSize: 11,
    fontWeight: '700',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  typingText: {
    fontSize: 13,
    marginLeft: 8,
    fontStyle: 'italic',
  },
});
