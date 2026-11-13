import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Dimensions,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { getAllConversations, sendMessage as sendMessageAPI, getClosetChatThreadsApi, getCachedMessagesUnread, setCachedMessagesUnread, sumConversationUnread } from '../../../services/chatMessage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppTheme } from '../../../theme/useApptheme';
import { getSocket, initializeSocket, getClosetChatThreads } from '../../../services/socket';
import useSocket from '../../../hooks/useSocket';
import { number } from 'yup';
import { useToast } from 'react-native-toast-notifications';
import { showToastMessage } from '../../../components/displaytoastmessage';
import { deleteConversationApi, chatStatusUpdate, sharePost } from '../../../services/post';
import HexAvatar from '../../../components/home/story.js/HexAvatar';
import { useLanguage } from '../../../i18n';
import { appendTrustPostShareFields } from '../../../utils/trustPost';

// Fallback icon component
const FallbackIcon = ({ name, size = 24, color = '#000', style }) => {
  const getIconText = (iconName) => {
    switch (iconName) {
      case 'arrow-back':
        return '←';
      case 'chevron-down':
        return '▼';
      case 'create-outline':
        return '✏️';
      case 'search':
        return '🔍';
      case 'trash-outline':
        return '🗑️';
      case 'checkmark-done':
      case 'checkmark-done-outline':
        return '✓✓';
      case 'checkmark-circle':
        return '✓';
      case 'checkmark-circle-outline':
      case 'ellipse-outline':
        return '○';
      case 'checkbox-outline':
        return '☐';
      case 'ellipsis-horizontal':
        return '•••';
      case 'close':
        return '✕';
      default:
        return '•';
    }
  };

  return (
    <View style={[{
      width: size,
      height: size,
      justifyContent: 'center',
      alignItems: 'center',
    }, style]}>
      <Text style={{
        fontSize: size * 0.8,
        color: color,
        fontWeight: 'bold',
      }}>
        {getIconText(name)}
      </Text>
    </View>
  );
};

// Safe icon wrapper
const SafeIcon = ({ name, size = 24, color = '#000', style }) => {
  if (Icon) {
    try {
      return <Icon name={name} size={size} color={color} style={style} />;
    } catch (error) {
      console.warn('Error rendering icon:', error);
      return <FallbackIcon name={name} size={size} color={color} style={style} />;
    }
  }
  return <FallbackIcon name={name} size={size} color={color} style={style} />;
};

const ONLINE_PLACEHOLDER = 'https://ui-avatars.com/api/?name=User&background=e0e0e0&color=888&size=128';
const AVATAR_SIZE = 50;
const AVATAR_BORDER = 68;
const NOTE_CARD_HEIGHT = 32;

// Tab keys for the top switcher
const CHAT_TABS = {
  MESSAGES: 'messages',
  CLOSET: 'closet',
};

export default function ChatMessages() {
  const navigation = useNavigation();
  const route = useRoute();
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [messagesUnreadPreview, setMessagesUnreadPreview] = useState(getCachedMessagesUnread);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [socketReady, setSocketReady] = useState(false);
  const inputRef = useRef(null);
  const { bgStyle, textStyle, text, card, cardStyle, border, mutedText, mutedTextStyle, icon, accent } = useAppTheme();
  const toast = useToast();
  const { t } = useLanguage();
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [profileType, setProfileType] = useState('');

  const insets = useSafeAreaInsets();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [menuAnchorY, setMenuAnchorY] = useState(200);
  const moreBtnRef = useRef(null);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [dataSource, setDataSource] = useState('none');

  // ✅ Active tab: 'messages' | 'closet'
  const [activeTab, setActiveTab] = useState(CHAT_TABS.MESSAGES);
  const [closetThreads, setClosetThreads] = useState([]);
  const [closetUnreadTotal, setClosetUnreadTotal] = useState(null);
  const [isClosetLoading, setIsClosetLoading] = useState(false);
  const [closetError, setClosetError] = useState(null);

  const readClosetUnreadTotal = (payload) => {
    if (!payload || Array.isArray(payload)) return null;
    const raw = payload.totalUnreadcount ?? payload.totalUnreadCount ?? payload.totalUnread;
    const count = Number(raw);
    return Number.isFinite(count) ? count : null;
  };

  const closetThreadsCountRef = useRef(0);
  closetThreadsCountRef.current = closetThreads.length;

  const fetchClosetConversations = useCallback(async () => {
    if (!currentUserId) return;
    try {
      if (closetThreadsCountRef.current === 0) setIsClosetLoading(true);
      const response = await getClosetChatThreadsApi();
      if (response && response.success) {
        const received = Array.isArray(response.data)
          ? response.data
          : (response.data?.threads || []);
        setClosetThreads(received);
        setClosetUnreadTotal(readClosetUnreadTotal(response.data));
        setClosetError(null);
      } else {
        setClosetError(response?.message || 'Failed to fetch closet chat threads');
      }
    } catch (err) {
      console.warn('❌ API getClosetChatThreads error:', err);
      setClosetError(err.message || 'Failed to fetch closet chat threads');
    } finally {
      setIsClosetLoading(false);
    }
  }, [currentUserId]);

  // Load closet unread as soon as Messages opens, before the closet tab is tapped.
  useEffect(() => {
    if (!currentUserId || !isScreenFocused) return;
    fetchClosetConversations();
  }, [currentUserId, isScreenFocused, fetchClosetConversations]);

  // Messages unread does not wait for the socket. Home already has this total,
  // and this request fills it if that cache is still empty.
  useEffect(() => {
    if (!currentUserId || !isScreenFocused) return;
    let cancelled = false;

    (async () => {
      try {
        const response = await getAllConversations();
        if (cancelled || !response?.success || !Array.isArray(response.data)) return;
        const total = sumConversationUnread(response.data);
        setCachedMessagesUnread(total);
        setMessagesUnreadPreview(total);
      } catch (error) {
        console.warn('❌ ChatMessages: messages unread prefetch failed', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, isScreenFocused]);

  const isBusinessProfile = String(profileType || '').toLowerCase() === 'company'
    || String(profileType || '').toLowerCase() === 'business';
  const closetChatTitle = isBusinessProfile
    ? t('chatMessages.shopChatLabel', 'Shop chat')
    : t('chatMessages.myClosetChatLabel', 'My Closet Chat');

  const hasProcessedShareRef = useRef(false);
  // Locally hidden chats (survives socket refresh until server marks isHidden)
  const hiddenChatIdsRef = useRef(new Set());

  const handleBackPress = useCallback(() => {
    if (isSelectionMode) {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      return;
    }

    const { returnTo, returnParams, returnToTab } = route?.params || {};

    if (returnTo) {
      const parentNavigation = navigation.getParent?.();

      if (returnToTab && returnToTab !== 'HomeMain' && parentNavigation?.navigate) {
        parentNavigation.navigate(returnToTab, {
          screen: returnTo,
          params: returnParams || {},
        });
        return;
      }

      if (returnTo === 'FlipsScreen' && parentNavigation?.navigate) {
        parentNavigation.navigate('ProfileMain', {
          screen: 'FlipsScreen',
          params: returnParams || {},
        });
        return;
      }

      navigation.navigate(returnTo, returnParams || {});
      return;
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.getParent?.()?.navigate?.('HomeMain');
  }, [navigation, route?.params, isSelectionMode]);

  useEffect(() => {
    const onBackPress = () => {
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [isSelectionMode]);

  // ✅ Get current user ID and initialize socket on mount
  useEffect(() => {
    const initializeUserAndSocket = async () => {
      try {
        const storedProfile = await AsyncStorage.getItem('profile');
        setProfileType(storedProfile || '');
        const userId = await AsyncStorage.getItem('userId');
        if (userId) {
          setCurrentUserId(userId);
          
          const socket = getSocket();
          if (!socket || !socket.connected) {
            await initializeSocket(userId);
            setSocketReady(true);
          } else {
            setSocketReady(true);
          }
        } else {
          Alert.alert(t('chatMessages.errorTitle'), t('chatMessages.loginRequired'));
        }
      } catch (error) {
        console.error('❌ Error initializing user and socket:', error);
        Alert.alert(t('chatMessages.errorTitle'), t('chatMessages.failedToLoadUser'));
      }
    };

    initializeUserAndSocket();
  }, [t]);

  // ✅ Handle socket reconnection
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleConnect = () => {
      setSocketReady(true);
      
      if (currentUserId) {
        if (activeTab === CHAT_TABS.CLOSET) {
          getClosetChatThreads(currentUserId);
          fetchClosetConversations();
        } else {
          socket.emit('getUserChatBox', { userId: currentUserId });
        }
      }
    };

    const handleDisconnect = () => {
      setSocketReady(false);
    };

    const handleReconnect = () => {
      setSocketReady(true);
      
      if (currentUserId) {
        if (activeTab === CHAT_TABS.CLOSET) {
          getClosetChatThreads(currentUserId);
          fetchClosetConversations();
        } else {
          socket.emit('getUserChatBox', { userId: currentUserId });
        }
      }
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnect', handleReconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnect', handleReconnect);
    };
  }, [currentUserId, activeTab, fetchClosetConversations]);

  // ✅ Request chat box when user ID is available, socket is ready, or active tab changes
  useEffect(() => {
    if (currentUserId && socketReady) {
      const socket = getSocket();
      if (socket?.connected) {
        if (activeTab === CHAT_TABS.CLOSET) {
          setIsClosetLoading(true);
          getClosetChatThreads(currentUserId);
          fetchClosetConversations();
        } else {
          socket.emit('getUserChatBox', { userId: currentUserId });
        }
      }
    }
  }, [currentUserId, socketReady, activeTab, fetchClosetConversations]);

  // ✅ Handle shared content from ShareModal
  useEffect(() => {
    const handleSharedContent = async () => {
      const { selectedUserIds, sharedContent, fromShareModal } = route?.params || {};
      
      if (!fromShareModal || !sharedContent || !selectedUserIds || selectedUserIds.length === 0) {
        return;
      }

      if (hasProcessedShareRef.current) {
        return;
      }
      
      if (!currentUserId) {
        return;
      }

      hasProcessedShareRef.current = true;


      try {
        
        showToastMessage(
          toast,
          'success',
          t('chatMessages.sharingWith', { count: selectedUserIds.length }),
          2000
        );

        let successCount = 0;
        let failCount = 0;

        try {
          let mediaType, mediaId;
          if (sharedContent.post) {
            mediaType = 'POST';
            mediaId = sharedContent.postId;
          } else if (sharedContent.reel) {
            mediaType = 'REEL';
            mediaId = sharedContent.reelId;
          } else if (sharedContent.story) {
            mediaType = 'STORY';
            mediaId = sharedContent.storyId;
            if (mediaId) {
              mediaId = String(mediaId).replace(/_\d+$/, '');
            }
          }


          if (mediaType && mediaId) {
            const sharePayload = {
              mediaId: mediaId,
              mediaType: mediaType,
              conversationType: 'MEDIA',
              sharedUserId: currentUserId,
              receiverUserId: selectedUserIds
            };
            const shareResponse = await sharePost(sharePayload);
          }
        } catch (shareError) {
          console.error('❌ SharePost API error:', shareError.message);
        }

        for (let i = 0; i < selectedUserIds.length; i++) {
          const userId = selectedUserIds[i];
          
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          try {

            const messageType = sharedContent.post ? 'POST_SHARE'
              : sharedContent.reel ? 'REEL_SHARE'
                : sharedContent.story ? 'STORY_SHARE'
                  : 'MEDIA';

            const messageData = {
              senderId: String(currentUserId),
              receiverId: String(userId),
              type: messageType,
            };

            if (sharedContent.postId) messageData.postId = sharedContent.postId;
            if (sharedContent.reelId) messageData.reelId = sharedContent.reelId;
            if (sharedContent.storyId) {
              let storyId = String(sharedContent.storyId).replace(/_\d+$/, '');
              messageData.storyId = storyId;
            }

            if (sharedContent.post) {
              Object.assign(
                messageData,
                appendTrustPostShareFields(messageData, sharedContent.post),
              );
            }


            const socket = getSocket();
            if (socket?.connected) {
              socket.emit('sendMessage', messageData);
            }

            try {
              const response = await sendMessageAPI(messageData);
              if (response?.success) {
                successCount++;
              } else {
                console.warn(`⚠️ API failed for ${userId}:`, response?.message);
              }
            } catch (apiErr) {
              console.error(`❌ API error for ${userId}:`, apiErr.message);
            }
          } catch (err) {
            console.error(`❌ Failed to send to user ${userId}:`, err.message);
            failCount++;
          }
        }


        const socket = getSocket();
        if (socket?.connected) {
          socket.emit('getUserChatBox', { userId: currentUserId });
        }

        if (successCount > 0) {
          showToastMessage(
            toast,
            'success',
            t('chatMessages.sharedToCount', { count: successCount }),
            2000
          );
        }
        
        if (failCount > 0) {
          showToastMessage(
            toast,
            'error',
            t('chatMessages.shareFailedCount', { count: failCount }),
            2000
          );
        }

        setTimeout(() => {
          navigation.setParams({
            selectedUserIds: undefined,
            sharedContent: undefined,
            fromShareModal: undefined,
          });
        }, 500);

      } catch (error) {
        console.error('❌ Error processing shared content:', error);
        Alert.alert(t('chatMessages.errorTitle'), t('chatMessages.shareError'));
        hasProcessedShareRef.current = false;
      }
    };

    handleSharedContent();
  }, [route?.params, conversations, navigation, currentUserId, toast, t]);

  // ✅ Reset shared content processing flag when shared content is cleared
  useEffect(() => {
    const { fromShareModal } = route?.params || {};
    if (!fromShareModal) {
      hasProcessedShareRef.current = false;
    }
  }, [route?.params]);

  // ✅ Listen for chat box updates (conversation list)
  useSocket('userChatBox', (data) => {
    
    if (!data) {
      return;
    }

    let conversationsData = [];
    
    if (Array.isArray(data)) {
      conversationsData = data;
    } else if (data.success && Array.isArray(data.data)) {
      conversationsData = data.data;
    }

    
    const processedConversations = processConversationsData(conversationsData);
    
    setConversations(processedConversations);
    setDataSource('socket');
    setIsLoading(false);
    setError(null);
  }, [currentUserId]);

  useSocket('messageSeen', (payload) => {
    if (!payload?.messageId) return;

    setConversations(prev =>
      prev.map(conversation =>
        String(conversation.lastMessageId) === String(payload.messageId)
          ? { ...conversation, lastMessageIsSeen: true }
          : conversation,
      ),
    );
  }, []);

  // ✅ Listen for new messages to update conversation list in real-time
  useSocket('newMessage', (message) => {

    if (!message || !currentUserId) {
      return;
    }

    const receiverId = String(message.receiver?.id || message.receiverId || '');
    const senderId = String(message.sender?.id || message.senderId || '');
    const me = String(currentUserId);

    if (receiverId === me && senderId !== me && !isScreenFocused) {
      const senderName = message.sender?.displayName || message.sender?.username || t('chatMessages.someone');

      let messagePreview = '';
      if (message.type === 'MEDIA') {
        messagePreview = t('chatMessages.sharedMedia');
      } else if (message.type === 'POST_SHARE') {
        messagePreview = t('chatMessages.sharedPost');
      } else if (message.type === 'REEL_SHARE') {
        messagePreview = t('chatMessages.sharedReel');
      } else if (message.type === 'STORY_SHARE') {
        messagePreview = t('chatMessages.sharedStory');
      } else {
        messagePreview = message.content || message.message || t('chatMessages.newMessage');
      }

      showToastMessage(
        toast,
        'success',
        `${senderName}: ${messagePreview}`,
        3000
      );
    }

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('getUserChatBox', { userId: currentUserId });
    }
  }, [currentUserId, toast, isScreenFocused, t]);

  // ✅ Listen for messageSent event to update conversation list
  useSocket('messageSent', (message) => {

    if (!message || !currentUserId) return;

    const senderId = String(message.sender?.id || message.senderId || '');
    const me = String(currentUserId);

    if (senderId === me) {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('getUserChatBox', { userId: currentUserId });
      }
    }
  }, [currentUserId]);

  // ✅ Listen for Closet Chat thread success
  useSocket('closetChatThreads', (data) => {
    setClosetThreads(Array.isArray(data) ? data : data?.threads || []);
    setClosetUnreadTotal(readClosetUnreadTotal(data));
    setIsClosetLoading(false);
    setClosetError(null);
  }, []);

  // ✅ Listen for Closet Chat thread error
  useSocket('closetChatThreadsError', (data) => {
    console.warn('📨 ChatMessages: Received closetChatThreadsError:', data?.message);
    setClosetError(data?.message || 'Failed to fetch closet chat threads');
    setIsClosetLoading(false);
  }, []);

  // ✅ Listen for Closet Chat new message push to refresh list
  useSocket('closetChatNewMessage', (message) => {
    if (currentUserId) {
      getClosetChatThreads(currentUserId);
    }
  }, [currentUserId]);

  // ✅ Listen for Closet Chat seen confirmations to update unread badge / seen state in list
  useSocket('closetChatMessageSeen', (data) => {
    if (currentUserId) {
      getClosetChatThreads(currentUserId);
    }
  }, [currentUserId]);

  // ✅ Periodic refresh to catch any missed messages
  useEffect(() => {
    if (!currentUserId || !socketReady) {
      return;
    }

    
    const interval = setInterval(() => {
      const socket = getSocket();
      if (socket?.connected && isScreenFocused) {
        if (activeTab === CHAT_TABS.CLOSET) {
          getClosetChatThreads(currentUserId);
        } else {
          socket.emit('getUserChatBox', { userId: currentUserId });
        }
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUserId, socketReady, isScreenFocused, activeTab]);

  // fetchConversations hook is moved below processConversationsData to satisfy ESLint dependency declaration order.

  // ✅ Track screen focus state and request fresh data when focused
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      // Refresh conversations when screen becomes active
      if (activeTab !== CHAT_TABS.CLOSET) {
        fetchConversations();
      }

      if (currentUserId) {
        const checkAndReconnectSocket = async () => {
          const socket = getSocket();
          if (!socket || !socket.connected) {
            const newSocket = await initializeSocket(currentUserId);
            if (newSocket?.connected) {
              setSocketReady(true);
              if (activeTab === CHAT_TABS.CLOSET) {
                getClosetChatThreads(currentUserId);
                fetchClosetConversations();
              } else {
                newSocket.emit('getUserChatBox', { userId: currentUserId });
              }
            }
          } else {
            if (activeTab === CHAT_TABS.CLOSET) {
              getClosetChatThreads(currentUserId);
              fetchClosetConversations();
            } else {
              socket.emit('getUserChatBox', { userId: currentUserId });
            }
          }
        };
        checkAndReconnectSocket();
      }

      return () => {
        setIsScreenFocused(false);
      };
    }, [currentUserId, activeTab, fetchConversations, fetchClosetConversations])
  );

  // ✅ Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    if (!currentUserId || !socketReady) return;
    
    setRefreshing(true);
    
    const socket = getSocket();
    if (socket?.connected) {
      if (activeTab === CHAT_TABS.CLOSET) {
        getClosetChatThreads(currentUserId);
        fetchClosetConversations();
      } else {
        socket.emit('getUserChatBox', { userId: currentUserId });
      }
    }
    
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, [currentUserId, socketReady, activeTab, fetchClosetConversations]);

  const formatTimestamp = useCallback((timestamp) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageDate) / (1000 * 60));

    if (diffInMinutes < 1) {
      return t('chatMessages.timestampNow');
    } else if (diffInMinutes < 60) {
      return t('chatMessages.timestampMinutes', { count: diffInMinutes });
    } else if (diffInMinutes < 1440) {
      return t('chatMessages.timestampHours', { count: Math.floor(diffInMinutes / 60) });
    } else {
      const diffInDays = Math.floor(diffInMinutes / 1440);
      if (diffInDays === 1) {
        return t('chatMessages.timestampOneDay');
      } else if (diffInDays < 7) {
        return t('chatMessages.timestampDays', { count: diffInDays });
      } else {
        return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }
    }
  }, [t]);

  const processConversationsData = useCallback((conversationsData) => {

    if (!Array.isArray(conversationsData)) {
      console.warn('❌ Invalid conversations data format:', conversationsData);
      return [];
    }

    if (conversationsData.length === 0) {
      return [];
    }

    const conversationMap = new Map();

    conversationsData.forEach((item, index) => {
      const hasLastMessage = !!item.lastMessage;
      const hasUser = !!item.user;
      const hasSender = !!item.sender;
      const hasReceiver = !!item.receiver;

      let conversation, message, chatId;

      if (hasLastMessage && hasUser) {
        const rawChatId = String(item?.id || '').trim();
        const isHidden =
          item?.isHidden === true ||
          String(item?.isHidden || '').toLowerCase() === 'true' ||
          String(item?.isHidden || '') === '1';
        if (isHidden || (rawChatId && hiddenChatIdsRef.current.has(rawChatId))) {
          return;
        }

        if (item.isHidden === true) {
          return;
        }

        conversation = item;
        message = item.lastMessage;
        chatId = item.id;

      }
      else if (hasSender && hasReceiver) {

        // ✅ CHECK isHidden for old format too
        if (
          item.isHidden === true ||
          String(item?.isHidden || '').toLowerCase() === 'true' ||
          String(item?.isHidden || '') === '1'
        ) {
          return;
        }

        message = item;

        const isCurrentUserSender = message.sender.id === currentUserId;
        const chatPartner = isCurrentUserSender ? message.receiver : message.sender;
        const partnerId = chatPartner.id;

        // Prefer a stable server-provided conversation id when present.
        const serverChatId = String(
          item?.chatId ||
            item?.conversationId ||
            item?.threadId ||
            item?.roomId ||
            item?.id ||
            '',
        ).trim();

        const generatedChatId = [currentUserId, partnerId].sort().join('_');
        chatId = serverChatId || generatedChatId;

        if (chatId && hiddenChatIdsRef.current.has(String(chatId).trim())) {
          return;
        }

        // Create conversation-like structure
        conversation = {
          id: chatId,
          user: chatPartner,
          unreadCount: 0,
          isHidden: item.isHidden || false
        };
      } else {
        console.warn('⚠️ Unknown format, skipping item:', item);
        return;
      }

      if (!message) {
        return;
      }

      if (chatId && hiddenChatIdsRef.current.has(String(chatId))) {
        return;
      }

      const unreadCount = conversation?.unreadCount || 0;
      const isCurrentUserSender = (message.senderId || message.sender?.id) === currentUserId;
      const chatPartner = conversation.user || (isCurrentUserSender ? message.receiver : message.sender);

      if (!chatPartner?.id) {
        return;
      }

      const partnerId = chatPartner.id;
      const messageTime = new Date(message.createdAt);

      let previewMessage = "";

      if (message.type === "MEDIA") {
        previewMessage = isCurrentUserSender
          ? t('chatMessages.youSharedMedia')
          : t('chatMessages.sharedMedia');
      } else if (message.type === "CHAT") {
        const content = message.content || "";
        previewMessage = isCurrentUserSender
          ? `${t('chatMessages.you')}: ${content}`
          : content;
      } else if (message.type === "POST_SHARE") {
        previewMessage = isCurrentUserSender
          ? t('chatMessages.youSharedPost')
          : t('chatMessages.sharedPost');
      } else if (message.type === "REEL_SHARE") {
        previewMessage = isCurrentUserSender
          ? t('chatMessages.youSharedReel')
          : t('chatMessages.sharedReel');
      } else if (message.type === "STORY_SHARE") {
        previewMessage = isCurrentUserSender
          ? t('chatMessages.youSharedStory')
          : t('chatMessages.sharedStory');
      }

      if (
        !conversationMap.has(partnerId) ||
        messageTime > new Date(conversationMap.get(partnerId).lastMessageTime)
      ) {
        const lastMessageIsSeen = Number(message?.isSeen ?? 0) === 1;
        const conversationData = {
          id: partnerId,
          userId: partnerId,
          chatId: chatId,
          conversationId: item?.conversationId || item?.chatId || (chatId !== partnerId ? chatId : (item?.id || chatId)),
          conversationType: 'NORMAL',
          lastMessageId: message.id,
          username: chatPartner.displayName || chatPartner.username || t('chatMessages.unknownUser'),
          displayName: chatPartner.displayName,
          avatar: chatPartner.image || ONLINE_PLACEHOLDER,
          lastMessage: previewMessage,
          lastMessageTime: message.createdAt,
          timestamp: formatTimestamp(message.createdAt),
          unreadCount: unreadCount,
          isOnline: chatPartner.isOnline || false,
          sentByMe: isCurrentUserSender,
          lastMessageIsSeen,
          type: message.type,
          user: {
            id: partnerId,
            displayName: chatPartner.displayName,
            username: chatPartner.username,
            image: chatPartner.image,
          }
        };

        conversationMap.set(partnerId, conversationData);
      }
    });

    const result = Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime)
    );

    return result;
  }, [currentUserId, t, formatTimestamp]);

  // ✅ Fetch conversations via API (only as fallback if socket data not received)
  const fetchConversations = useCallback(async () => {
    if (!currentUserId) return;

    if (dataSource === 'socket') {
      return;
    }

    try {
      // Avoid flashing loader when list is already visible.
      if (conversations.length === 0) setIsLoading(true);

      const response = await getAllConversations();

      if (response.success && response.data) {
        const processedConversations = processConversationsData(response.data);
        setConversations(processedConversations);
        setDataSource('api');
        setError(null);
      } else {
        setError(response.message || t('chatMessages.failedToLoad'));
      }
    } catch (error) {
      console.error('❌ Error fetching conversations:', error);
      setError(t('chatMessages.failedToLoad'));
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, dataSource, conversations.length, t, processConversationsData]);

  const handleUserChat = async (item) => {
    if (activeTab === CHAT_TABS.CLOSET) {
      navigation.navigate('UserClosetChat', {
        threadId: item.threadId,
        otherUser: item.otherUser,
        orderInfo: item.orderInfo,
      });
      return;
    }

    if (!item.userId || !item.user) {
      Alert.alert(t('chatMessages.errorTitle'), t('chatMessages.unableToOpenChat'));
      return;
    }
    
    if (item.unreadCount > 0) {
      try {
        chatStatusUpdate(item.chatId)
          .then((response) => {
            
            const socket = getSocket();
            if (socket?.connected) {
              socket.emit('getUserChatBox', { userId: currentUserId });
            }
          })
          .catch((err) => {
          });
      } catch (error) {
      }
    }

    navigation.navigate('UserChat', {
      userId: item.userId,
      user: item.user,
    });
  };

  const handleLongPress = (item) => {
    setSelectedConversation(item);
    setShowDeleteModal(true);
  };

  const handleDeleteConversation = async () => {
    if (!selectedConversation) {
      setShowDeleteModal(false);
      return;
    }

    const convId = selectedConversation.conversationId || selectedConversation.chatId || selectedConversation.threadId || selectedConversation.id;

    if (!convId) {
      console.warn('⚠️ [ChatMessages:handleDeleteConversation] Unable to delete: missing ID', selectedConversation);
      showToastMessage(toast, 'error', t('chatMessages.unableToDelete'), 2000);
      setShowDeleteModal(false);
      return;
    }

    setIsDeleting(true);

    try {
      const convType = selectedConversation.isClosetChat || selectedConversation.conversationType === 'CLOSET'
        ? 'CLOSET'
        : 'NORMAL';

      console.log('🗑️ [ChatMessages:handleDeleteConversation] Requesting delete:', { convId, convType });
      const response = await deleteConversationApi(convId, convType);
      console.log('📥 [ChatMessages:handleDeleteConversation] Response:', response);

      const isSuccess = Boolean(
        response && (
          response.success === true ||
          response.statusCode === 200 ||
          response.status === 200 ||
          response.data?.success === true
        )
      );

      if (isSuccess) {
        if (selectedConversation.chatId != null) {
          hiddenChatIdsRef.current.add(String(selectedConversation.chatId).trim());
        }
        if (selectedConversation.id != null) {
          hiddenChatIdsRef.current.add(String(selectedConversation.id).trim());
        }
        if (selectedConversation.threadId != null) {
          hiddenChatIdsRef.current.add(String(selectedConversation.threadId).trim());
        }
        if (selectedConversation.conversationId != null) {
          hiddenChatIdsRef.current.add(String(selectedConversation.conversationId).trim());
        }

        if (convType === 'CLOSET') {
          setClosetThreads(prev =>
            prev.filter(thr => {
              const id = String(thr.threadId || thr.id);
              return id !== String(convId) && id !== String(selectedConversation.id);
            })
          );
        } else {
          setConversations(prev =>
            prev.filter(conv => {
              const id = String(conv.chatId || conv.id || conv.conversationId);
              return id !== String(convId) && id !== String(selectedConversation.id);
            })
          );
        }

        const successMsg = response?.data?.message || response?.message || t('chatMessages.deleteSuccess');
        showToastMessage(
          toast,
          'success',
          successMsg,
          2000
        );
      } else {
        const errorMsg = response?.data?.message || response?.message || t('chatMessages.deleteFailed');
        showToastMessage(
          toast,
          'error',
          errorMsg,
          2000
        );
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
      const errorMsg = error?.response?.data?.message || error?.message || t('chatMessages.deleteFailed');
      showToastMessage(
        toast,
        'error',
        errorMsg,
        2000
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setSelectedConversation(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setSelectedConversation(null);
  };

  const toggleSelectItem = (id) => {
    if (!id) return;
    const strId = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(strId)) {
        next.delete(strId);
      } else {
        next.add(strId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const visibleIds = filteredConversations.map(c => String(c.id || c.chatId || c.threadId)).filter(Boolean);
    const isAllSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleIds));
    }
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleOpenMenu = () => {
    if (filteredConversations.length === 0) {
      showToastMessage(toast, 'info', t('chatMessages.noConversationsFound') || 'No conversations', 2000);
      return;
    }
    moreBtnRef.current?.measureInWindow?.((x, y, width, height) => {
      if (y && height) {
        setMenuAnchorY(y + height + 6);
      }
      setMoreMenuVisible(true);
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) {
      setShowBatchDeleteModal(false);
      return;
    }
    setIsBatchDeleting(true);
    try {
      const toDeleteList = filteredConversations.filter(c => {
        const id = String(c.id || c.chatId || c.threadId);
        return (
          selectedIds.has(id) ||
          (c.chatId && selectedIds.has(String(c.chatId))) ||
          (c.threadId && selectedIds.has(String(c.threadId))) ||
          (c.conversationId && selectedIds.has(String(c.conversationId)))
        );
      });

      console.log('🗑️ [ChatMessages:handleBatchDelete] Starting batch delete for', toDeleteList.length, 'conversations:', {
        selectedIds: Array.from(selectedIds),
        items: toDeleteList.map(item => ({
          id: item.id,
          chatId: item.chatId,
          threadId: item.threadId,
          conversationId: item.conversationId,
          isClosetChat: item.isClosetChat,
        }))
      });

      const results = await Promise.allSettled(
        toDeleteList.map(async (item) => {
          const convId = item.conversationId || item.chatId || item.threadId || item.id;
          const convType = item.isClosetChat || item.conversationType === 'CLOSET' ? 'CLOSET' : 'NORMAL';
          if (convId) {
            hiddenChatIdsRef.current.add(String(convId).trim());
            if (item.chatId) hiddenChatIdsRef.current.add(String(item.chatId).trim());
            if (item.id) hiddenChatIdsRef.current.add(String(item.id).trim());
            if (item.threadId) hiddenChatIdsRef.current.add(String(item.threadId).trim());
            console.log(`🚀 [ChatMessages:handleBatchDelete] Calling delete API for ${convId} (${convType})`);
            const res = await deleteConversationApi(convId, convType);
            console.log(`✅ [ChatMessages:handleBatchDelete] API Response for ${convId}:`, res);
            return res;
          }
          return null;
        })
      );

      console.log('📊 [ChatMessages:handleBatchDelete] All settled results:', results);

      const successfulResults = results.filter(
        r => r.status === 'fulfilled' && r.value && (
          r.value.success === true ||
          r.value.statusCode === 200 ||
          r.value.status === 200 ||
          r.value.data?.success === true
        )
      );

      if (successfulResults.length > 0) {
        if (activeTab === CHAT_TABS.CLOSET) {
          setClosetThreads(prev => prev.filter(thr => {
            const id = String(thr.threadId || thr.id);
            return !selectedIds.has(id);
          }));
        } else {
          setConversations(prev => prev.filter(c => {
            const id = String(c.id || c.chatId || c.conversationId);
            return !selectedIds.has(id) && !(c.chatId && selectedIds.has(String(c.chatId)));
          }));
        }

        const firstApiMsg = successfulResults[0]?.value?.data?.message || successfulResults[0]?.value?.message;
        const successMsg = toDeleteList.length === 1 && firstApiMsg
          ? firstApiMsg
          : (t('chatMessages.multipleDeleteSuccess', { count: successfulResults.length }) || `${successfulResults.length} conversation(s) deleted`);

        showToastMessage(
          toast,
          'success',
          successMsg,
          2000
        );
      } else {
        const rejectedReason = results.find(r => r.status === 'rejected')?.reason;
        const failedResult = results.find(r => r.status === 'fulfilled')?.value;
        const errorMsg =
          rejectedReason?.response?.data?.message ||
          rejectedReason?.message ||
          failedResult?.data?.message ||
          failedResult?.message ||
          t('chatMessages.deleteFailed') ||
          'Failed to delete conversations';

        showToastMessage(toast, 'error', errorMsg, 2000);
      }
    } catch (err) {
      console.error('Error batch deleting conversations:', err);
      const errorMsg = err?.response?.data?.message || err?.message || t('chatMessages.deleteFailed') || 'Failed to delete conversations';
      showToastMessage(toast, 'error', errorMsg, 2000);
    } finally {
      setIsBatchDeleting(false);
      setShowBatchDeleteModal(false);
      handleExitSelectionMode();
    }
  };

  const handleTabChange = (newTab) => {
    if (activeTab !== newTab) {
      if (isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
      }
      setMoreMenuVisible(false);
      setActiveTab(newTab);
    }
  };

  const renderChatItem = ({ item }) => {
    const itemId = String(item.id || item.chatId || item.threadId);
    const isSelected = selectedIds.has(itemId) || (item.chatId && selectedIds.has(String(item.chatId))) || (item.threadId && selectedIds.has(String(item.threadId)));

    return (
      <TouchableOpacity
        style={[
          styles.chatItem,
          cardStyle,
          {
            shadowColor: text,
            borderColor: isSelected ? accent : border,
            borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth,
            backgroundColor: isSelected ? (card ? `${accent}14` : '#f6f0ff') : (cardStyle?.backgroundColor || '#fff'),
          }
        ]}
        onPress={() => {
          if (isSelectionMode) {
            toggleSelectItem(itemId);
            return;
          }
          handleUserChat(item);
        }}
        onLongPress={() => {
          if (isSelectionMode) {
            toggleSelectItem(itemId);
          } else {
            handleLongPress(item);
          }
        }}
        delayLongPress={400}
        activeOpacity={0.7}
      >
        {isSelectionMode && (
          <View style={styles.selectionCheckboxWrapper}>
            <SafeIcon
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isSelected ? accent : mutedText}
            />
          </View>
        )}
        <View style={styles.avatarContainer}>
          <View style={styles.storyNoRing}>
            <HexAvatar
              uri={item.avatar || ONLINE_PLACEHOLDER}
              size={48}
              borderWidth={2}
              borderColor={icon}
            />
            {item.isOnline && <View style={[styles.onlineDot, { borderColor: card }]} />}
          </View>
        </View>
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.username, item.unreadCount > 0 && styles.unreadMessage, textStyle]}>{item.username}</Text>
            <Text style={[styles.timestamp, { color: mutedText }]}>{item.timestamp}</Text>
          </View>
          <View style={styles.messageRow}>
            {item.lastMessage ? (
              <Text
                style={[
                  styles.lastMessage,
                  { color: item.unreadCount > 0 ? text : mutedText },
                  item.unreadCount > 0 && { fontWeight: '700' },
                ]}
                numberOfLines={1}
              >
                {item.lastMessage}
              </Text>
            ) : (
              <Text
                style={[styles.lastMessage, { color: mutedText }, item.unreadCount > 0 && { fontWeight: '600' }]}
                numberOfLines={1}
              >
                {t('chatMessages.startConversation')}
              </Text>
            )}

            {item.sentByMe && (
              <SafeIcon
                name="checkmark-done"
                size={16}
                color={item.lastMessageIsSeen ? accent : mutedText}
                style={styles.readReceiptIcon}
              />
            )}

            {item.unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: accent }]}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Map closet threads to standard conversation list shape
  const mappedClosetConversations = closetThreads.map(thread => {
    const otherUser = thread.otherUser || {};
    const lastMsgObj = thread.lastMessage || {};
    const lastMsgText = typeof thread.lastMessage === 'string'
      ? thread.lastMessage
      : (lastMsgObj.message || lastMsgObj.content || '');
    const lastMsgTime = lastMsgObj.createdAt || lastMsgObj.timestamp || new Date().toISOString();

    return {
      id: thread.threadId || thread.id,
      threadId: thread.threadId || thread.id,
      chatId: thread.threadId || thread.id,
      conversationId: thread.conversationId || thread.threadId || thread.id,
      conversationType: 'CLOSET',
      userId: otherUser.id || otherUser.userId,
      username: otherUser.displayName || otherUser.username || 'User',
      displayName: otherUser.displayName,
      avatar: otherUser.avatar || otherUser.image || ONLINE_PLACEHOLDER,
      lastMessage: lastMsgText,
      timestamp: formatTimestamp(lastMsgTime),
      unreadCount: Number(thread.unreadCount ?? thread.unreadcount) || 0,
      isOnline: otherUser.isOnline || false,
      otherUser: otherUser,
      orderInfo: thread.orderInfo || thread.order,
      isClosetChat: true,
      user: {
        id: otherUser.id || otherUser.userId,
        displayName: otherUser.displayName,
        username: otherUser.username,
        image: otherUser.avatar || otherUser.image
      }
    };
  });

  // Only "Messages" tab conversations are regular chats for now.
  const messagesTabConversations = conversations.filter(c => !c.isClosetChat);

  const activeConversations = activeTab === CHAT_TABS.CLOSET
    ? mappedClosetConversations
    : messagesTabConversations;

  const filteredConversations = activeConversations.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const liveMessagesUnread = conversations.reduce((acc, conversation) => {
    if (conversation.isHidden === true) {
      return acc;
    }
    const unread = conversation.unreadCount || 0;
    return acc + unread;
  }, 0);
  const hasLiveMessages = dataSource !== 'none' || conversations.length > 0;
  const messagesUnread = hasLiveMessages ? liveMessagesUnread : messagesUnreadPreview;

  useEffect(() => {
    if (!hasLiveMessages) return;
    setCachedMessagesUnread(liveMessagesUnread);
  }, [hasLiveMessages, liveMessagesUnread]);

  const closetUnreadFromThreads = closetThreads.reduce((acc, thread) => {
    return acc + (Number(thread.unreadCount ?? thread.unreadcount) || 0);
  }, 0);
  const closetUnread = closetUnreadTotal == null ? closetUnreadFromThreads : closetUnreadTotal;

  const formatTabUnread = (count) => (count > 99 ? '99+' : String(count));

  const activeLoading = activeTab === CHAT_TABS.CLOSET ? isClosetLoading : isLoading;
  const activeError = activeTab === CHAT_TABS.CLOSET ? closetError : error;

  return (
    <SafeAreaView style={[styles.container, bgStyle]}>
      {/* Header */}
      <View style={[styles.header, bgStyle, { shadowColor: text, borderBottomColor: border }]}>
        <TouchableOpacity onPress={handleBackPress}>
          <SafeIcon name="arrow-back" size={24} color={accent} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, textStyle]}>{t('chatMessages.title')}</Text>
        <View style={{ flex: 1 }} />
      </View>

      {/* Search Bar */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
        style={[styles.searchContainer, cardStyle, { shadowColor: text, borderColor: border, borderWidth: StyleSheet.hairlineWidth }]}
      >
        <View style={styles.searchWrapper}>
          <SafeIcon name="search" size={20} color={mutedText} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={[styles.searchInput, textStyle]}
            placeholder={t('chatMessages.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={mutedText}
          />
        </View>
      </TouchableOpacity>

      {/* Messages / My closet chat Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: border }]}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange(CHAT_TABS.MESSAGES)}
          activeOpacity={0.7}
        >
          <View style={styles.tabLabelRow}>
            <Text
              style={[
                styles.tabText,
                activeTab === CHAT_TABS.MESSAGES
                  ? { color: accent, fontWeight: '700' }
                  : mutedTextStyle,
              ]}
            >
              {t('chatMessages.messagesLabel')}
            </Text>
            {messagesUnread > 0 && (
              <View style={[styles.tabUnreadBadge, { backgroundColor: accent }]}>
                <Text style={styles.tabUnreadBadgeText}>{formatTabUnread(messagesUnread)}</Text>
              </View>
            )}
          </View>
          {activeTab === CHAT_TABS.MESSAGES && (
            <View style={[styles.tabUnderline, { backgroundColor: accent }]} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => handleTabChange(CHAT_TABS.CLOSET)}
          activeOpacity={0.7}
        >
          <View style={styles.tabLabelRow}>
            <Text
              style={[
                styles.tabText,
                activeTab === CHAT_TABS.CLOSET
                  ? { color: accent, fontWeight: '700' }
                  : mutedTextStyle,
              ]}
            >
              {closetChatTitle}
            </Text>
            {closetUnread > 0 && (
              <View style={[styles.tabUnreadBadge, { backgroundColor: accent }]}>
                <Text style={styles.tabUnreadBadgeText}>{formatTabUnread(closetUnread)}</Text>
              </View>
            )}
          </View>
          {activeTab === CHAT_TABS.CLOSET && (
            <View style={[styles.tabUnderline, { backgroundColor: accent }]} />
          )}
        </TouchableOpacity>
      </View>

      {/* Section Header with Section Title & (...) Pill Button */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, textStyle]}>
          {isSelectionMode
            ? (selectedIds.size > 0
                ? `${selectedIds.size} ${t('chatMessages.selected')}`
                : t('chatMessages.selectMessages'))
            : (activeTab === CHAT_TABS.CLOSET ? closetChatTitle : t('chatMessages.messagesLabel'))}
        </Text>

        {!isSelectionMode ? (
          <TouchableOpacity
            ref={moreBtnRef}
            style={[styles.moreButton, { borderColor: accent }]}
            onPress={handleOpenMenu}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <SafeIcon name="ellipsis-horizontal" size={18} color={accent} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.doneHeaderBtn}
            onPress={handleExitSelectionMode}
            activeOpacity={0.7}
          >
            <Text style={[styles.doneHeaderText, { color: accent }]}>
              {t('chatMessages.done')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chat List with RefreshControl */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: isSelectionMode ? 110 : 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[accent]}
            tintColor={accent}
            title={t('chatMessages.pullToRefresh')}
            titleColor={text}
          />
        }
      >
        {activeLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, textStyle]}>{t('chatMessages.loadingConversations')}</Text>
          </View>
        ) : activeError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{activeError}</Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: accent }]}
              onPress={() => {
                const socket = getSocket();
                if (socket?.connected) {
                  if (activeTab === CHAT_TABS.CLOSET) {
                    setIsClosetLoading(true);
                    getClosetChatThreads(currentUserId);
                  } else {
                    socket.emit('getUserChatBox', { userId: currentUserId });
                  }
                } else {
                  if (activeTab !== CHAT_TABS.CLOSET) {
                    fetchConversations();
                  }
                }
              }}
            >
              <Text style={styles.retryText}>{t('chatMessages.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredConversations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, textStyle]}>
              {search
                ? t('chatMessages.noConversationsFound')
                : activeTab === CHAT_TABS.CLOSET
                  ? "No closet chats yet. Chat starts after paid orders on eligible items."
                  : t('chatMessages.noConversationsYet')}
            </Text>
            {!search && (
              <Text style={[styles.emptySubtext, mutedTextStyle]}>
                {activeTab === CHAT_TABS.CLOSET
                  ? (t('chatMessages.closetChatHint') || 'Chats you keep here stay separate from your main inbox')
                  : t('chatMessages.startConversationHint')}
              </Text>
            )}
          </View>
        ) : (
          filteredConversations.map(item => (
            <View key={item.id}>
              {renderChatItem({ item })}
              <View style={styles.separator} />
            </View>
          ))
        )}
      </ScrollView>

      {/* Delete Single Conversation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle, { borderColor: border, borderWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.modalHeader}>
              <SafeIcon name="trash-outline" size={32} color="#ff6b6b" />
              <Text style={[styles.modalTitle, textStyle]}>{t('chatMessages.deleteTitle')}</Text>
            </View>

            <Text style={[styles.modalMessage, textStyle]}>
              {t('chatMessages.deleteConfirm')}{' '}
              <Text style={[styles.modalUsername, textStyle]}>{selectedConversation?.username}</Text>?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: border }]}
                onPress={handleCancelDelete}
                disabled={isDeleting}
              >
                <Text style={[styles.cancelButtonText, textStyle]}>{t('chatMessages.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteConversation}
                disabled={isDeleting}
              >
                <Text style={styles.deleteButtonText}>
                  {isDeleting ? t('chatMessages.deleting') : t('chatMessages.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Batch Delete Confirmation Modal */}
      <Modal
        visible={showBatchDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBatchDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, cardStyle, { borderColor: border, borderWidth: StyleSheet.hairlineWidth }]}>
            <View style={styles.modalHeader}>
              <SafeIcon name="trash-outline" size={32} color="#ff6b6b" />
              <Text style={[styles.modalTitle, textStyle]}>{t('chatMessages.deleteTitle')}</Text>
            </View>

            <Text style={[styles.modalMessage, textStyle]}>
              {t('chatMessages.deleteMultipleConfirm', { count: selectedIds.size })}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { backgroundColor: border }]}
                onPress={() => setShowBatchDeleteModal(false)}
                disabled={isBatchDeleting}
              >
                <Text style={[styles.cancelButtonText, textStyle]}>{t('chatMessages.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleBatchDelete}
                disabled={isBatchDeleting}
              >
                <Text style={styles.deleteButtonText}>
                  {isBatchDeleting ? t('chatMessages.deleting') : t('chatMessages.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Popover Dropdown Menu (Image 2 mockup) */}
      <Modal
        visible={moreMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMoreMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMoreMenuVisible(false)}>
          <View style={styles.popoverOverlay}>
            <View
              style={[
                styles.popoverMenu,
                cardStyle,
                {
                  top: menuAnchorY,
                  borderColor: border || '#E8E0F2',
                  backgroundColor: card || '#fff',
                }
              ]}
            >
              {/* Select */}
              <TouchableOpacity
                style={styles.popoverMenuItem}
                onPress={() => {
                  setMoreMenuVisible(false);
                  setIsSelectionMode(true);
                  setSelectedIds(new Set());
                }}
                activeOpacity={0.7}
              >
                <SafeIcon name="checkbox-outline" size={19} color={accent} style={styles.popoverMenuIcon} />
                <Text style={[styles.popoverMenuText, textStyle]}>
                  {t('chatMessages.select')}
                </Text>
              </TouchableOpacity>

              <View style={[styles.popoverDivider, { backgroundColor: border || '#F1E8FB' }]} />

              {/* Delete */}
              <TouchableOpacity
                style={styles.popoverMenuItem}
                onPress={() => {
                  setMoreMenuVisible(false);
                  setIsSelectionMode(true);
                  setSelectedIds(new Set());
                }}
                activeOpacity={0.7}
              >
                <SafeIcon name="trash-outline" size={19} color="#ff4d4f" style={styles.popoverMenuIcon} />
                <Text style={[styles.popoverMenuText, { color: '#ff4d4f' }]}>
                  {t('chatMessages.delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Bottom Action Bar in Selection Mode */}
      {isSelectionMode && (
        <View style={[styles.bottomActionBar, cardStyle, { borderTopColor: border, backgroundColor: card || '#fff', paddingBottom: Math.max(insets.bottom, 12) }]}>
          {/* Select All / Deselect */}
          <TouchableOpacity
            style={styles.bottomActionBtn}
            onPress={handleToggleSelectAll}
            activeOpacity={0.7}
          >
            <SafeIcon
              name={
                filteredConversations.length > 0 &&
                filteredConversations.every(c => selectedIds.has(String(c.id || c.chatId || c.threadId)))
                  ? "checkmark-circle"
                  : "checkmark-circle-outline"
              }
              size={20}
              color={accent}
            />
            <Text style={[styles.bottomActionText, { color: accent }]}>
              {filteredConversations.length > 0 &&
              filteredConversations.every(c => selectedIds.has(String(c.id || c.chatId || c.threadId)))
                ? t('chatMessages.deselectAll')
                : t('chatMessages.selectAll')}
            </Text>
          </TouchableOpacity>

          {/* Delete */}
          <TouchableOpacity
            style={[styles.bottomActionBtn, selectedIds.size === 0 && { opacity: 0.35 }]}
            disabled={selectedIds.size === 0}
            onPress={() => setShowBatchDeleteModal(true)}
            activeOpacity={0.7}
          >
            <SafeIcon name="trash-outline" size={20} color="#ff4d4f" />
            <Text style={[styles.bottomActionText, { color: '#ff4d4f' }]}>
              {selectedIds.size > 0 ? `${t('chatMessages.delete')} (${selectedIds.size})` : t('chatMessages.delete')}
            </Text>
          </TouchableOpacity>

          {/* Done */}
          <TouchableOpacity
            style={[styles.doneBottomBtn, { backgroundColor: accent }]}
            onPress={handleExitSelectionMode}
            activeOpacity={0.7}
          >
            <Text style={styles.doneBottomBtnText}>
              {t('chatMessages.done')}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dbdbdb',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    height: 42,
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    fontSize: 15,
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
  },
  tabButton: {
    marginRight: 24,
    paddingBottom: 8,
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabUnreadBadge: {
    marginLeft: 6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabUnreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  tabUnderline: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    width: '100%',
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 12,
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  avatarContainer: {
    marginRight: 12,
  },
  storyNoRing: {
    position: 'relative',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#f3f0f7',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#32cd59',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  unreadMessage: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readReceiptIcon: {
    marginLeft: 6,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadLastMessage: {
    fontWeight: '600',
  },
  unreadBadge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  separator: {
    height: 10,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  moreButton: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  doneHeaderText: {
    fontSize: 15,
    fontWeight: '700',
  },
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  popoverMenu: {
    position: 'absolute',
    right: 16,
    width: 170,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
  },
  popoverMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 12,
  },
  popoverMenuIcon: {
    width: 22,
    textAlign: 'center',
  },
  popoverMenuText: {
    fontSize: 15,
    fontWeight: '700',
  },
  popoverDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  selectionCheckboxWrapper: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 12,
  },
  bottomActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 3,
  },
  bottomActionText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  doneBottomBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneBottomBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  modalUsername: {
    fontWeight: '700',
    color: '#5a2d82',
  },
  modalWarning: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
