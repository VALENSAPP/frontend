import React, { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Keyboard,
  Platform,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';
import {
  getComments,
  postComment,
  postDralensReply,
  deleteComment,
  editComment,
  postCommentReaction,
} from '../../../services/post';
import { checkContentModeration, parseModerationResult } from '../../../services/moderation';
import { useToast } from 'react-native-toast-notifications';
import { showToastMessage } from '../../displaytoastmessage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import { useDispatch, useSelector } from 'react-redux';
import { useAppTheme } from '../../../theme/useApptheme';
import { useThemeContext } from '../../../theme/ThemeContext';
import HexAvatar from '../story.js/HexAvatar';
import { LavenderDragonfly } from '../../../assets/icons';
import { useLanguage } from '../../../i18n';
import ReportFlowScreen from '../../modals/Report';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { searchUsers, getAllUser } from '../../../services/users';
import {
  getActiveMention,
  insertMention,
  normalizeSearchUsers,
  rankMentionUsers,
  resolveUserIdFromUsername,
} from '../../../utils/mentionUtils';
import { parseText } from '../../../utils/commentUtils';

const mapCommentItem = comment => ({
  id: String(comment.id),
  userId: String(comment.userId),
  username: comment.displayName || 'Unknown',
  avatar:
    comment.image || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
  text: comment.comment || '',
  time: formatDistanceToNow(new Date(comment.createdAt), {
    addSuffix: true,
  }),
  parentId: comment.parentId || null,
  replies: [],
  likeCount: comment.likeCount || 0,
  dislikeCount: comment.dislikeCount || 0,
  userReaction: comment.userReaction || null,
  commentType: comment.commentType || null,
});

const flattenCommentEntries = entries =>
  (Array.isArray(entries) ? entries : []).reduce((acc, comment) => {
    acc.push(comment);
    if (Array.isArray(comment?.replies) && comment.replies.length > 0) {
      acc.push(...flattenCommentEntries(comment.replies));
    }
    return acc;
  }, []);

const buildCommentTree = comments => {
  const flatComments = flattenCommentEntries(comments).map(mapCommentItem);
  const byId = new Map();
  const parentMap = new Map();

  flatComments.forEach(comment => {
    const sId = String(comment.id);
    byId.set(sId, { ...comment, replies: [] });
    if (comment.parentId) {
      parentMap.set(sId, String(comment.parentId));
    }
  });

  const roots = [];

  flatComments.forEach(comment => {
    const sId = String(comment.id);
    const normalizedComment = byId.get(sId);
    const parentId = comment.parentId ? String(comment.parentId) : '';

    if (parentId && byId.has(parentId)) {
      let rootId = parentId;
      const visited = new Set([sId]);
      while (parentMap.has(rootId) && byId.has(parentMap.get(rootId)) && !visited.has(rootId)) {
        visited.add(rootId);
        rootId = parentMap.get(rootId);
      }

      const rootComment = byId.get(rootId);
      if (rootComment && String(rootComment.id) !== sId) {
        if (!rootComment.replies.some(r => String(r.id) === sId)) {
          rootComment.replies.push(normalizedComment);
        }
        return;
      }
    }

    roots.push(normalizedComment);
  });

  return roots;
};


const DralensAiCommentView = memo(({
  item,
  labelColor,
  mutedText,
  accent,
  isDarkMode,
  toast,
  isReply = false,
  onReplyPress,
  onAskDralens,
}) => {
  const { t } = useLanguage();
  return (
    <View style={styles.dralensCommentRow}>
      <View
        style={[
          styles.dralensAvatarWrap,
          {
            backgroundColor: isDarkMode ? '#2D1B4E' : '#F3E8FF',
            borderColor: isDarkMode ? 'rgba(168, 85, 247, 0.4)' : '#D8B4FE',
          },
        ]}>
        <LavenderDragonfly width={22} height={22} />
      </View>
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <View style={styles.dralensNameRow}>
            <Text style={[styles.dralensUsername, { color: labelColor }]}>
              {item.username || 'Dralens AI'}
            </Text>
            <View style={[styles.aiBadge, { backgroundColor: accent || '#8B5CF6' }]}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
          <Text style={[styles.time, { color: mutedText }]}>{item.time}</Text>
        </View>

        <View
          style={[
            styles.dralensBubble,
            {
              backgroundColor: isDarkMode ? 'rgba(139, 92, 246, 0.12)' : '#FAF5FF',
              borderColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : '#E9D5FF',
            },
          ]}>
          <Text style={[styles.dralensBubbleText, { color: labelColor }]}>
            {item.text}
          </Text>
        </View>

        <View style={styles.dralensActionsRow}>
          <View style={styles.dralensActionLeftButtons}>
            <TouchableOpacity
              onPress={() => onReplyPress?.(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.replyButtonText, { color: accent }]}>
                {t('commentSheet.reply') || 'Reply'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onAskDralens?.(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={[styles.replyButtonText, { color: '#8B5CF6', fontWeight: '700' }]}>
                ✦ Ask Dralens
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.dralensCopyButton}
            onPress={() => {
              Clipboard.setString(item.text || '');
              showToastMessage(toast, 'success', 'Copied to clipboard');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="copy-outline" size={13} color={mutedText} />
            <Text style={[styles.dralensCopyText, { color: mutedText }]}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

DralensAiCommentView.displayName = 'DralensAiCommentView';

const CommentItem = memo(
  ({
    item,
    onMorePress,
    onCloseSheet,
    currentUserId,
    postOwnerId,
    returnTo,
    returnParams,
    onReplyPress,
    expandedReplies,
    onToggleReplies,
    onThumbsUpPress,
    onThumbsDownPress,
    commentVotes,
    onAskDralens,
  }) => {
    const { t } = useLanguage();
    const { cardStyle, border, mutedText, accent } = useAppTheme();
    const { isDarkMode } = useThemeContext();
    const labelColor = isDarkMode ? '#ffffff' : '#111827';
    const inputSurface = isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f2';
    const replySurface = isDarkMode ? 'rgba(255,255,255,0.06)' : '#f8f8f8';

    const navigation = useNavigation();
    const normalizeId = id => (id != null ? String(id).trim() : '');

    const viewerId = normalizeId(currentUserId);
    const itemUserId = normalizeId(item.userId);
    const ownerId = normalizeId(postOwnerId);

    const votes = commentVotes?.[item.id] || {
      thumbsUp: 0,
      thumbsDown: 0,
      userVote: null,
    };

    const isCommentAuthor = viewerId && itemUserId === viewerId;
    const isPostOwner = viewerId && ownerId === viewerId;
    const canModerate = isCommentAuthor || isPostOwner;
    const hasReplies = Array.isArray(item.replies) && item.replies.length > 0;
    const isExpanded = !!expandedReplies[item.id];

    const handleNavigateToProfile = useCallback(
      userId => {
        if (!userId) return;
        onCloseSheet?.();
        requestAnimationFrame(() => {
          const parentNavigation = navigation.getParent?.();
          const params = { userId, returnTo, returnParams };

          if (parentNavigation?.navigate) {
            parentNavigation.navigate('HomeMain', {
              screen: 'UsersProfile',
              params,
            });
            return;
          }

          navigation.navigate('HomeMain', {
            screen: 'UsersProfile',
            params,
          });
        });
      },
      [navigation, onCloseSheet, returnParams, returnTo],
    );

    const toast = useToast();
    const mentionPressLock = useRef(false);

    const handleMentionPress = useCallback(
      async mentionPart => {
        if (mentionPressLock.current) return;
        const username = String(mentionPart || '')
          .replace(/^@+/, '')
          .trim();
        if (!username) return;

        mentionPressLock.current = true;
        try {
          const userId = await resolveUserIdFromUsername(username);
          if (!userId) {
            showToastMessage(toast, 'danger', t('postEditor.openProfileError'));
            return;
          }
          handleNavigateToProfile(userId);
        } catch (_) {
          showToastMessage(toast, 'danger', t('postEditor.openProfileError'));
        } finally {
          mentionPressLock.current = false;
        }
      },
      [handleNavigateToProfile, t, toast],
    );

    const TRUST_BADGE_CONFIG = {
      AGREE: { label: 'Agree Vote', color: '#059669', bg: '#ECFDF5', icon: '👍' },
      NOT_SURE: { label: 'Not Sure', color: '#D97706', bg: '#FFFBEB', icon: '🤔' },
      DISAGREE: { label: 'Disagree Vote', color: '#DC2626', bg: '#FEF2F2', icon: '👎' },
    };

    const TrustVoteBadge = ({ commentType }) => {
      const config = TRUST_BADGE_CONFIG[String(commentType || '').toUpperCase()];
      if (!config) return null;
      return (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 4,
          alignSelf: 'flex-start',
          backgroundColor: config.bg,
          borderRadius: 20,
          paddingHorizontal: 8, paddingVertical: 3,
          marginBottom: 4,
          borderWidth: 0.5,
          borderColor: config.color + '44',
        }}>
          <Text style={{ fontSize: 11 }}>{config.icon}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: config.color }}>
            {config.label}
          </Text>
        </View>
      );
    };

    return (
      <View
        style={[
          styles.commentCard,
          cardStyle,
          { borderColor: border },
          item.isOptimistic && styles.optimisticComment,
        ]}>
        {item.isDralensAi ? (
          <DralensAiCommentView
            item={item}
            labelColor={labelColor}
            mutedText={mutedText}
            accent={accent}
            isDarkMode={isDarkMode}
            toast={toast}
            onReplyPress={onReplyPress}
            onAskDralens={onAskDralens}
          />
        ) : (
          <View style={styles.commentRow}>
            <TouchableOpacity
              onPress={() => handleNavigateToProfile(item?.userId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.hexAvatarWrap}
              accessibilityRole="button"
            >
              <HexAvatar uri={item.avatar} size={28} borderWidth={1} borderColor={accent} />
            </TouchableOpacity>
          <View style={styles.commentContent}>
            <View style={styles.commentHeader}>
              <Text style={[styles.username, { color: labelColor }]}>{item.username}</Text>
              <Text style={[styles.time, { color: mutedText }]}>{item.time}</Text>
            </View>
            <TrustVoteBadge commentType={item.commentType} />
            <Text style={[styles.commentText, { color: labelColor }]}>
              {parseText(item.text, {
                mention: { color: accent, fontWeight: '700' },
                hashtag: { color: accent, fontWeight: '600' },
                plain: { color: labelColor },
                onMentionPress: handleMentionPress,
              })}
            </Text>
            <View style={styles.commentActionsRow}>
              <TouchableOpacity onPress={() => onReplyPress?.(item)}>
                <Text style={[styles.replyButtonText, { color: accent }]}>
                  {t('commentSheet.reply')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onAskDralens?.(item)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.replyButtonText, { color: '#8B5CF6', fontWeight: '700' }]}>
                  ✦ Ask Dralens
                </Text>
              </TouchableOpacity>

              <View style={styles.votingContainer}>
                <TouchableOpacity
                  style={styles.voteButton}
                  onPress={() => onThumbsUpPress?.(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text
                    style={[
                      styles.voteIcon,
                      votes.userVote === 'up' && styles.voteIconActive,
                    ]}>
                    👍
                  </Text>
                  {votes.thumbsUp > 0 && (
                    <Text
                      style={[
                        styles.voteCount,
                        votes.userVote === 'up' && [styles.voteCountActive, { color: accent }],
                      ]}>
                      {votes.thumbsUp}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.voteButton}
                  onPress={() => onThumbsDownPress?.(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text
                    style={[
                      styles.voteIcon,
                      votes.userVote === 'down' && styles.voteIconActive,
                    ]}>
                    👎
                  </Text>
                  {votes.thumbsDown > 0 && (
                    <Text
                      style={[
                        styles.voteCount,
                        votes.userVote === 'down' && [styles.voteCountActive, { color: accent }],
                      ]}>
                      {votes.thumbsDown}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {hasReplies ? (
              <TouchableOpacity
                onPress={() => onToggleReplies?.(item.id)}
                style={styles.toggleRepliesRow}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <View style={[styles.toggleRepliesLine, { backgroundColor: mutedText }]} />
                <Text style={[styles.toggleRepliesText, { color: accent }]}>
                  {isExpanded
                    ? t('commentSheet.hideReplies')
                    : t('commentSheet.viewReplies', { count: item.replies.length })}
                </Text>
                <Icon
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={13}
                  color={accent}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.starIcon}
            onPress={() => onMorePress?.(item)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="ellipsis-vertical" size={18} color={labelColor} />
          </TouchableOpacity>
        </View>
        )}

        {hasReplies && isExpanded ? (
          <View style={styles.repliesSection}>
            {item.replies.map(reply => {
              const replyVotes = commentVotes?.[reply.id] || {
                thumbsUp: 0,
                thumbsDown: 0,
                userVote: null,
              };
              const replyUserId =
                reply.userId != null ? String(reply.userId).trim() : '';
              const isReplyAuthor = viewerId && replyUserId === viewerId;
              const canModerateReply = isReplyAuthor || isPostOwner;
              if (reply.isDralensAi) {
                return (
                  <View
                    key={reply.id}
                    style={[
                      styles.replyCard,
                      styles.dralensReplyCard,
                      { backgroundColor: isDarkMode ? 'rgba(124, 58, 237, 0.08)' : '#FAF5FF', borderColor: isDarkMode ? 'rgba(124, 58, 237, 0.25)' : '#E9D5FF' },
                    ]}>
                    <DralensAiCommentView
                      item={reply}
                      labelColor={labelColor}
                      mutedText={mutedText}
                      accent={accent}
                      isDarkMode={isDarkMode}
                      toast={toast}
                      isReply
                      onReplyPress={onReplyPress}
                      onAskDralens={onAskDralens}
                    />
                  </View>
                );
              }
              return (
                <View key={reply.id} style={[styles.replyCard, { backgroundColor: replySurface }]}>
                  <TouchableOpacity
                    onPress={() => handleNavigateToProfile(reply?.userId)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.hexAvatarWrap}
                    accessibilityRole="button"
                  >
                    <HexAvatar uri={reply.avatar} size={28} borderWidth={1} borderColor={accent} />
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={[styles.username, { color: labelColor }]}>{reply.username}</Text>
                      <Text style={[styles.time, { color: mutedText }]}>{reply.time}</Text>
                    </View>
                    <Text style={[styles.commentText, { color: labelColor }]}>
                      {parseText(reply.text, {
                        mention: { color: accent, fontWeight: '700' },
                        hashtag: { color: accent, fontWeight: '600' },
                        plain: { color: labelColor },
                        onMentionPress: handleMentionPress,
                      })}
                    </Text>
                    <View style={styles.commentActionsRow}>
                      <TouchableOpacity onPress={() => onReplyPress?.(reply)}>
                        <Text style={[styles.replyButtonText, { color: accent }]}>
                          {t('commentSheet.reply')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => onAskDralens?.(reply)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={[styles.replyButtonText, { color: '#8B5CF6', fontWeight: '700' }]}>
                          ✦ Ask Dralens
                        </Text>
                      </TouchableOpacity>
                      <View style={styles.votingContainer}>
                        <TouchableOpacity
                          style={styles.voteButton}
                          onPress={() => onThumbsUpPress?.(reply.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text
                            style={[
                              styles.voteIcon,
                              replyVotes.userVote === 'up' && styles.voteIconActive,
                            ]}>
                            👍
                          </Text>
                          {replyVotes.thumbsUp > 0 && (
                            <Text
                              style={[
                                styles.voteCount,
                                replyVotes.userVote === 'up' && [styles.voteCountActive, { color: accent }],
                              ]}>
                              {replyVotes.thumbsUp}
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.voteButton}
                          onPress={() => onThumbsDownPress?.(reply.id)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text
                            style={[
                              styles.voteIcon,
                              replyVotes.userVote === 'down' && styles.voteIconActive,
                            ]}>
                            👎
                          </Text>
                          {replyVotes.thumbsDown > 0 && (
                            <Text
                              style={[
                                styles.voteCount,
                                replyVotes.userVote === 'down' && [styles.voteCountActive, { color: accent }],
                              ]}>
                              {replyVotes.thumbsDown}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        style={styles.starIcon}
                        onPress={() => onMorePress?.(reply)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon
                          name="ellipsis-vertical"
                          size={18}
                          color={labelColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    );
  },
);

export default function CommentSheet({
  postId,
  postText = '',
  postOwnerUsername = '',
  postMedia = null,
  currentUser,
  onClose,
  postOwnerId,
  onCommentCountUpdate,
  returnTo,
  returnParams,
}) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const reportRef = useRef(null);
  const [reportingComment, setReportingComment] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const [userId, setUserId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(new Set());
  const [editingComment, setEditingComment] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [commentVotes, setCommentVotes] = useState({});
  const [mentionUsers, setMentionUsers] = useState([]);
  const [mentionLoading, setMentionLoading] = useState(false);
  const [activeMention, setActiveMention] = useState(null);
  const [inputSelection, setInputSelection] = useState({ start: 0, end: 0 });
  const [replySelection, setReplySelection] = useState({ start: 0, end: 0 });
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isAskingDralens, setIsAskingDralens] = useState(false);
  const [askDralensTarget, setAskDralensTarget] = useState(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);

  const isFetchingRef = useRef(false);
  const mentionSearchRef = useRef(null);
  const mentionRequestIdRef = useRef(0);
  const commentTextRef = useRef('');
  const replyTextRef = useRef('');
  const inputSelectionRef = useRef({ start: 0, end: 0 });
  const replySelectionRef = useRef({ start: 0, end: 0 });
  const activeMentionRef = useRef(null);
  const inputRef = useRef(null);
  const pendingAiRepliesRef = useRef(new Set());

  const buildImagePayload = useCallback(() => {
    let imagePayload = null;
    const mediaObj = Array.isArray(postMedia) ? postMedia[0] : postMedia;
    const rawUrl = mediaObj?.url || mediaObj?.uri || (typeof mediaObj === 'string' ? mediaObj : null);
    if (rawUrl) {
      const mediaUri = String(rawUrl);
      imagePayload = {
        uri: mediaUri,
        name: mediaUri.split('/').pop()?.split('?')[0] || 'image.jpg',
        type: mediaObj?.type === 'video' ? 'video/mp4' : 'image/jpeg',
      };
    }
    return imagePayload;
  }, [postMedia]);

  const getRootCommentId = useCallback(
    targetComment => {
      if (!targetComment) return null;
      const targetId = String(targetComment.id || '');
      const parentId = targetComment.parentId ? String(targetComment.parentId) : '';

      // 1. Direct top-level comment
      for (const c of comments) {
        if (String(c.id) === targetId) return String(c.id);
      }

      // 2. Target parent is a top-level comment
      if (parentId) {
        for (const c of comments) {
          if (String(c.id) === parentId) return String(c.id);
        }
      }

      // 3. Target is within any top-level comment's replies
      for (const c of comments) {
        if (Array.isArray(c.replies)) {
          const found = c.replies.some(
            r => String(r.id) === targetId || (parentId && String(r.id) === parentId),
          );
          if (found) return String(c.id);
        }
      }

      return parentId || targetId;
    },
    [comments],
  );

  const fulfillDralensComment = useCallback(async (commentItem) => {
    if (!commentItem?.id || pendingAiRepliesRef.current.has(commentItem.id)) return;
    pendingAiRepliesRef.current.add(commentItem.id);

    try {
      const rawText = commentItem.text || '';
      const userQuery = rawText.replace(/@dralens\s*/gi, '').trim() || rawText;
      if (!userQuery) return;

      const imagePayload = buildImagePayload();
      const response = await postDralensReply({
        postId,
        commentId: commentItem.id,
        userQuery,
        postText: postText || '',
        authorUsername: commentItem.username || postOwnerUsername || '',
        parentCommentContext: commentItem.text || postText || '',
        image: imagePayload,
      });

      const isSuccess = response?.status === 'success' || response?.success === true || (response && !response?.error && !response?.message);
      if (!isSuccess || !response?.reply_text) return;

      const aiReply = {
        id: `dralens-${commentItem.id}-${Date.now()}`,
        isDralensAi: true,
        userId: 'dralens-bot',
        username: response.bot_name || 'Dralens AI',
        avatar: 'dralens_ai',
        text: response.reply_text,
        time: t('commentSheet.justNow') || 'Just now',
        parentId: commentItem.id,
        replies: [],
        likeCount: 0,
        dislikeCount: 0,
      };

      try {
        const storageKey = `@dralens_replies_${postId}`;
        const existingRaw = await AsyncStorage.getItem(storageKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        if (!existing.some(r => r.id === aiReply.id || (r.parentId === commentItem.id && r.text === aiReply.text))) {
          existing.push(aiReply);
          await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
        }
      } catch (storageErr) {
        console.warn('Failed saving auto-fulfilled reply:', storageErr);
      }

      setComments(prev =>
        prev.map(c => {
          const isMatchingRoot = String(c.id) === String(commentItem.id);
          const isMatchingChild =
            Array.isArray(c.replies) &&
            c.replies.some(r => String(r.id) === String(commentItem.id));

          if (isMatchingRoot || isMatchingChild) {
            const currentReplies = c.replies || [];
            if (currentReplies.some(r => r.isDralensAi || r.text === aiReply.text)) return c;
            return {
              ...c,
              replies: [...currentReplies, aiReply],
            };
          }
          return c;
        })
      );
      const rootId = getRootCommentId(commentItem);
      if (rootId) {
        setExpandedReplies(prev => ({ ...prev, [rootId]: true }));
      }
    } catch (err) {
      console.warn('fulfillDralensComment error:', err);
    }
  }, [postId, postText, postOwnerUsername, buildImagePayload, t, getRootCommentId]);

  const toast = useToast();
  const { t, currentLanguage } = useLanguage();
  const insets = useSafeAreaInsets();
  const profileImage = useSelector(state => state.profileImage?.profileImg);
  const { bgStyle, card, border, mutedText, accent } = useAppTheme();
  const { isDarkMode } = useThemeContext();
  const labelColor = isDarkMode ? '#ffffff' : '#111827';
  const inputSurface = isDarkMode ? 'rgba(255,255,255,0.08)' : '#f2f2f2';

  // ─── helpers ────────────────────────────────────────────────────────────────

  const buildVotesMap = rawList =>
    rawList.reduce((map, c) => {
      const userVote =
        c.userReaction === 'LIKE'
          ? 'up'
          : c.userReaction === 'DISLIKE'
            ? 'down'
            : null;
      map[String(c.id)] = {
        thumbsUp: c.likeCount || 0,
        thumbsDown: c.dislikeCount || 0,
        userVote,
      };
      return map;
    }, {});

  const flattenRaw = rawComments =>
    (Array.isArray(rawComments) ? rawComments : []).reduce((acc, c) => {
      acc.push(c);
      if (Array.isArray(c?.replies)) acc.push(...c.replies);
      return acc;
    }, []);

  // ─── fetch ───────────────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const isFirstLoad = comments.length === 0;
    if (isFirstLoad) setInitialLoading(true);

    try {
      const response = await getComments(postId);
      if (response.success) {
        const raw = response.data.comments;
        const tree = buildCommentTree(raw);

        // Merge stored Dralens AI replies
        try {
          const storageKey = `@dralens_replies_${postId}`;
          const existingRaw = await AsyncStorage.getItem(storageKey);
          if (existingRaw) {
            const storedDralens = JSON.parse(existingRaw);
            if (Array.isArray(storedDralens) && storedDralens.length > 0) {
              storedDralens.forEach(aiReply => {
                let placed = false;
                for (let root of tree) {
                  const rootIdStr = String(root.id);
                  const parentIdStr = String(aiReply.parentId || '');
                  const isMatchingRoot =
                    rootIdStr === parentIdStr ||
                    (root.text && root.text.toLowerCase().includes('@dralens'));
                  const isMatchingChild =
                    Array.isArray(root.replies) &&
                    root.replies.some(
                      child =>
                        String(child.id) === parentIdStr ||
                        (child.text && child.text.toLowerCase().includes('@dralens')),
                    );

                  if (isMatchingRoot || isMatchingChild) {
                    if (!root.replies) root.replies = [];
                    if (!root.replies.some(r => String(r.id) === String(aiReply.id) || r.text === aiReply.text)) {
                      root.replies.push(aiReply);
                    }
                    placed = true;
                    break;
                  }
                }
                if (!placed) {
                  if (!tree.some(c => String(c.id) === String(aiReply.id) || c.text === aiReply.text)) {
                    tree.unshift(aiReply);
                  }
                }
              });
            }
          }
        } catch (storageErr) {
          console.warn('Error merging stored Dralens replies:', storageErr);
        }

        const votes = buildVotesMap(flattenRaw(raw));

        setComments(tree);
        setCommentVotes(votes);
        onCommentCountUpdate?.(postId, tree.length);

        // Auto-expand any comment threads that contain Dralens AI replies
        const autoExpanded = {};
        tree.forEach(root => {
          if (root.replies && root.replies.some(r => r.isDralensAi)) {
            autoExpanded[root.id] = true;
          }
        });
        if (Object.keys(autoExpanded).length > 0) {
          setExpandedReplies(prev => ({ ...autoExpanded, ...prev }));
        }

        // Auto-fulfill any @dralens comments from server that don't have an AI reply yet
        tree.forEach(root => {
          if (
            root.text &&
            root.text.toLowerCase().includes('@dralens') &&
            !(root.replies && root.replies.some(r => r.isDralensAi))
          ) {
            fulfillDralensComment(root);
          }
          if (root.replies) {
            root.replies.forEach(child => {
              if (
                child.text &&
                child.text.toLowerCase().includes('@dralens') &&
                !(child.replies && child.replies.some(r => r.isDralensAi))
              ) {
                fulfillDralensComment(child);
              }
            });
          }
        });
      } else {
        showToastMessage(toast, 'danger', t('commentSheet.errorLoadFailed'));
      }
    } catch {
      showToastMessage(toast, 'danger', t('commentSheet.errorFetch'));
    } finally {
      setInitialLoading(false);
      isFetchingRef.current = false;
    }
  }, [postId, toast, onCommentCountUpdate]);

  useEffect(() => {
    if (postId) fetchComments();
    AsyncStorage.getItem('userId').then(id => setUserId(id || null));
  }, [postId, fetchComments]);

  // Manual keyboard inset — RBSheet's built-in KeyboardAvoidingView (esp. Android
  // behavior="height") fights adjustResize and makes the sheet bounce on post/dismiss.
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = event => {
      const next = Math.max(0, Math.round(event?.endCoordinates?.height || 0));
      setKeyboardOffset(prev => (prev === next ? prev : next));
    };
    const onHide = () => setKeyboardOffset(prev => (prev === 0 ? prev : 0));

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const clearMentionState = useCallback(() => {
    activeMentionRef.current = null;
    setActiveMention(null);
    setMentionUsers([]);
    setMentionLoading(false);
    if (mentionSearchRef.current) {
      clearTimeout(mentionSearchRef.current);
      mentionSearchRef.current = null;
    }
  }, []);

  const runMentionSearch = useCallback(
    (text, cursor, field) => {
      const mention = getActiveMention(text, cursor);
      if (!mention) {
        clearMentionState();
        return;
      }

      const query = String(mention?.query || '').trim();
      const nextActive = { ...mention, field };
      activeMentionRef.current = nextActive;
      setActiveMention(nextActive);

      if (mentionSearchRef.current) clearTimeout(mentionSearchRef.current);
      // Keep previous results visible while the next query loads (avoids flicker).
      setMentionLoading(true);
      const requestId = ++mentionRequestIdRef.current;
      const searchQuery = query;

      mentionSearchRef.current = setTimeout(async () => {
        try {
          let users = [];
          if (searchQuery.length > 0) {
            try {
              const response = await searchUsers(searchQuery);
              users = normalizeSearchUsers(response);
            } catch (_searchError) {
              users = [];
            }

            // Fallback to the same endpoint used by tag/search screens when
            // /user/search returns nothing or fails for partial queries.
            if (!users.length) {
              try {
                const fallback = await getAllUser({ userName: searchQuery });
                users = normalizeSearchUsers(fallback);
              } catch (_fallbackError) {
                users = [];
              }
            }
          } else {
            try {
              const fallback = await getAllUser();
              users = normalizeSearchUsers(fallback);
            } catch (_fallbackError) {
              users = [];
            }
          }

          if (requestId !== mentionRequestIdRef.current) return;
          const ranked = searchQuery.length
            ? rankMentionUsers(users, searchQuery, 8)
            : users.slice(0, 8);
          // Keep API order only when nothing matched our local ranking filters.
          setMentionUsers(ranked.length ? ranked : users.slice(0, 8));
        } catch (_error) {
          if (requestId !== mentionRequestIdRef.current) return;
          setMentionUsers([]);
        } finally {
          if (requestId === mentionRequestIdRef.current) {
            setMentionLoading(false);
          }
        }
      }, 180);
    },
    [clearMentionState],
  );

  const handleCommentTextChange = useCallback(
    text => {
      commentTextRef.current = text;
      setCommentText(text);
      runMentionSearch(text, text.length, 'comment');
    },
    [runMentionSearch],
  );

  const handleReplyTextChange = useCallback(
    text => {
      replyTextRef.current = text;
      setReplyText(text);
      runMentionSearch(text, text.length, 'reply');
    },
    [runMentionSearch],
  );

  const handleSelectMention = useCallback(
    user => {
      const mention = activeMentionRef.current;
      if (!mention || !user?.username) return;
      const field = mention.field;
      const currentText =
        field === 'reply' ? replyTextRef.current : commentTextRef.current;
      const cursor =
        field === 'reply'
          ? replySelectionRef.current.start
          : inputSelectionRef.current.start;
      const { text, cursor: nextCursor } = insertMention(
        currentText,
        cursor,
        mention.startIndex,
        user.username,
      );

      if (field === 'reply') {
        replyTextRef.current = text;
        replySelectionRef.current = { start: nextCursor, end: nextCursor };
        setReplyText(text);
        setReplySelection({ start: nextCursor, end: nextCursor });
      } else {
        commentTextRef.current = text;
        inputSelectionRef.current = { start: nextCursor, end: nextCursor };
        setCommentText(text);
        setInputSelection({ start: nextCursor, end: nextCursor });
      }
      clearMentionState();
    },
    [clearMentionState],
  );

  useEffect(
    () => () => {
      if (mentionSearchRef.current) clearTimeout(mentionSearchRef.current);
    },
    [],
  );

  // ─── send / edit / reply ─────────────────────────────────────────────────────

  const publishComment = useCallback(async (trimmedComment, moderationDecision = 'ALLOW') => {
    if (!trimmedComment) return;

    const underReview = moderationDecision === 'REVIEW';
    const postedMessage = messageKey =>
      underReview ? t('commentSheet.moderationReview') : t(messageKey);

    Keyboard.dismiss();
    clearMentionState();

    // ── EDIT FLOW ──────────────────────────────────────────────────────────────
    if (editingComment) {
      const oldText = editingComment.text;
      setIsPosting(true);

      setComments(prev =>
        prev.map(c =>
          c.id === editingComment.id
            ? { ...c, text: trimmedComment, time: t('commentSheet.editedJustNow') }
            : c,
        ),
      );
      setCommentText('');
      commentTextRef.current = '';
      setEditingComment(null);

      try {
        const response = await editComment(editingComment.id, trimmedComment);
        if (response.success) {
          await fetchComments();
          showToastMessage(toast, 'success', postedMessage('commentSheet.successCommentUpdated'));
        } else {
          setComments(prev =>
            prev.map(c =>
              c.id === editingComment.id ? { ...c, text: oldText } : c,
            ),
          );
          showToastMessage(toast, 'danger', t('commentSheet.errorUpdateFailed'));
        }
      } catch {
        setComments(prev =>
          prev.map(c =>
            c.id === editingComment.id ? { ...c, text: oldText } : c,
          ),
        );
        showToastMessage(toast, 'danger', t('commentSheet.errorUpdate'));
      } finally {
        setIsPosting(false);
      }
      return;
    }

    // ── REPLY FLOW ─────────────────────────────────────────────────────────────
    if (replyingToComment?.id) {
      setIsPosting(true);
      const threadId = getRootCommentId(replyingToComment) || replyingToComment.threadId || replyingToComment.id;

      // Optimistically add user's reply to the thread
      const tempReplyId = `temp-reply-${Date.now()}`;
      const optimisticReply = {
        id: tempReplyId,
        userId: currentUser?.id ?? userId,
        username: currentUser?.displayName || currentUser?.username || t('commentSheet.you') || 'You',
        avatar:
          currentUser?.avatar ||
          profileImage ||
          'https://cdn-icons-png.flaticon.com/512/149/149071.png',
        text: trimmedComment,
        time: t('commentSheet.justNow') || 'Just now',
        parentId: threadId,
        replies: [],
        isOptimistic: true,
      };

      setComments(prev =>
        prev.map(c => {
          if (String(c.id) === String(threadId)) {
            return {
              ...c,
              replies: [...(c.replies || []), optimisticReply],
            };
          }
          return c;
        }),
      );
      setExpandedReplies(prev => ({ ...prev, [threadId]: true }));

      setReplyText('');
      replyTextRef.current = '';
      setReplyingToComment(null);

      try {
        const response = await postComment(postId, trimmedComment, threadId);
        if (response.success) {
          setExpandedReplies(prev => ({ ...prev, [threadId]: true }));
          await fetchComments();
          showToastMessage(toast, 'success', postedMessage('commentSheet.successReplyPosted'));
        } else {
          setComments(prev =>
            prev.map(c => {
              if (String(c.id) === String(threadId)) {
                return {
                  ...c,
                  replies: (c.replies || []).filter(r => r.id !== tempReplyId),
                };
              }
              return c;
            }),
          );
          showToastMessage(toast, 'danger', t('commentSheet.errorReplyFailed'));
        }
      } catch {
        setComments(prev =>
          prev.map(c => {
            if (String(c.id) === String(threadId)) {
              return {
                ...c,
                replies: (c.replies || []).filter(r => r.id !== tempReplyId),
              };
            }
            return c;
          }),
        );
        showToastMessage(toast, 'danger', t('commentSheet.errorReply'));
      } finally {
        setIsPosting(false);
      }
      return;
    }

    // ── NEW TOP-LEVEL COMMENT ─────────────────────────────────────────────────
    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      id: tempId,
      userId: currentUser?.id,
      username: currentUser?.displayName || t('commentSheet.you'),
      avatar:
        currentUser?.avatar ||
        'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      text: trimmedComment,
      time: t('commentSheet.justNow'),
      replies: [],
      isOptimistic: true,
    };

    setComments(prev => [tempComment, ...prev]);
    setCommentText('');
    commentTextRef.current = '';
    onCommentCountUpdate?.(postId, comments.length + 1);
    setIsPosting(true);

    try {
      const response = await postComment(postId, trimmedComment);
      if (response.success) {
        await fetchComments();
        showToastMessage(toast, 'success', postedMessage('commentSheet.successCommentPosted'));
      } else {
        setComments(prev => prev.filter(c => c.id !== tempId));
        onCommentCountUpdate?.(postId, comments.length);
        showToastMessage(toast, 'danger', t('commentSheet.errorPostFailed'));
      }
    } catch {
      setComments(prev => prev.filter(c => c.id !== tempId));
      onCommentCountUpdate?.(postId, comments.length);
      showToastMessage(toast, 'danger', t('commentSheet.errorPost'));
    } finally {
      setIsPosting(false);
    }
  }, [
    replyingToComment,
    editingComment,
    postId,
    currentUser,
    comments.length,
    fetchComments,
    onCommentCountUpdate,
    toast,
    t,
    clearMentionState,
    getRootCommentId,
  ]);

  const handleSendComment = useCallback(async () => {
    const activeText = replyingToComment ? replyText : commentText;
    if (!activeText.trim()) {
      showToastMessage(toast, 'danger', t('commentSheet.errorEmptyComment'));
      return;
    }
    if (isPosting) return;

    const trimmedComment = activeText.trim();
    const isReply = !editingComment && Boolean(replyingToComment?.id);
    const replyToContentId = isReply
      ? String(replyingToComment.id)
      : String(postId || '');
    const contextIds = [];
    if (postId) contextIds.push(String(postId));
    if (isReply) {
      const parentId = String(replyingToComment.threadId || replyingToComment.id);
      if (parentId && !contextIds.includes(parentId)) contextIds.push(parentId);
    }

    setIsPosting(true);
    let moderation;
    try {
      const storedUserId = userId || (await AsyncStorage.getItem('userId'));
      const response = await checkContentModeration({
        user_id: storedUserId || '',
        content_id: editingComment?.id
          ? String(editingComment.id)
          : `temp_cmt_${Date.now()}`,
        content_type: 'comment',
        feature: 'post',
        text: trimmedComment,
        reply_to_content_id: replyToContentId,
        context_ids: contextIds,
        language: currentLanguage || 'en',
      });

      moderation = parseModerationResult(response);
      if (!moderation.decision) {
        throw new Error(response?.message || 'Moderation check failed');
      }
    } catch (err) {
      console.error('Comment moderation check error:', err);
      showToastMessage(toast, 'danger', t('commentSheet.moderationCheckFailed'));
      setIsPosting(false);
      return;
    }

    if (moderation.decision === 'BLOCK') {
      setIsPosting(false);
      Alert.alert(
        t('commentSheet.moderationBlockTitle'),
        moderation.reason
          ? t('commentSheet.moderationBlockReason', { reason: moderation.reason })
          : t('commentSheet.moderationBlock'),
      );
      return;
    }

    if (moderation.decision === 'WARN') {
      setIsPosting(false);
      Alert.alert(
        t('commentSheet.moderationWarnTitle'),
        t('commentSheet.moderationWarnMessage'),
        [
          { text: t('commentSheet.moderationNo'), style: 'cancel' },
          {
            text: t('commentSheet.moderationYes'),
            onPress: () => {
              publishComment(trimmedComment, 'ALLOW');
            },
          },
        ],
      );
      return;
    }

    await publishComment(trimmedComment, moderation.decision);
  }, [
    replyingToComment,
    replyText,
    commentText,
    isPosting,
    editingComment,
    postId,
    userId,
    currentLanguage,
    publishComment,
    toast,
    t,
    getRootCommentId,
  ]);

  // ─── comment actions ─────────────────────────────────────────────────────────

  const openActionsFor = useCallback(comment => {
    if (comment.isOptimistic) return;
    setSelectedComment(comment);
    setIsModalVisible(true);
  }, []);

  const handleReplyPress = useCallback(comment => {
    setEditingComment(null);
    const rootId = getRootCommentId(comment);
    setReplyingToComment({
      id: comment.id,
      username: comment.username,
      parentId: comment.parentId,
      threadId: rootId,
    });
    replyTextRef.current = '';
    setReplyText('');
    clearMentionState();
    setExpandedReplies(prev => ({
      ...prev,
      [rootId]: true,
    }));
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [clearMentionState, getRootCommentId]);

  const handleAskDralens = useCallback(async comment => {
    const isCommentReply = Boolean(comment?.id && comment.id !== postId);
    const target = isCommentReply
      ? comment
      : (replyingToComment?.id && replyingToComment.id !== postId ? replyingToComment : {
          id: postId,
          username: postOwnerUsername || '',
          text: postText || '',
          parentId: null,
        });
    if (!target?.id) return;

    setAskDralensTarget(target);

    if (isCommentReply || (replyingToComment?.id && replyingToComment.id !== postId)) {
      const rootId = getRootCommentId(target);
      setReplyingToComment({
        id: target.id,
        username: target.username || (target.isDralensAi ? 'Dralens AI' : ''),
        parentId: target.parentId || target.id,
        threadId: rootId,
      });
      setExpandedReplies(prev => ({ ...prev, [rootId]: true }));
      const curReply = replyTextRef.current || '';
      const baseReply = curReply.trim()
        ? (/@dralens\b/i.test(curReply) ? curReply : `@dralens ${curReply}`)
        : '@dralens ';
      replyTextRef.current = baseReply;
      setReplyText(baseReply);
      clearMentionState();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);

      // Auto-analyze specific comment and suggest a relevant reply that user can edit & post
      if (target.text && target.text.trim()) {
        setIsGeneratingSuggestion(true);
        try {
          const imagePayload = buildImagePayload();
          const response = await postDralensReply({
            postId,
            commentId: target.id,
            userQuery: 'Suggest a friendly, engaging, relevant reply to this comment',
            postText: postText || '',
            authorUsername: target.username || '',
            parentCommentContext: target.text,
            image: imagePayload,
          });

          if (response?.reply_text) {
            const cleanSuggestion = response.reply_text.trim();
            const curNow = replyTextRef.current || '';
            // If user hasn't typed their own text yet, populate the suggested reply
            if (curNow === '@dralens ' || curNow === '@dralens' || curNow === '' || curNow === baseReply) {
              const fullSuggested = `@dralens ${cleanSuggestion}`;
              replyTextRef.current = fullSuggested;
              setReplyText(fullSuggested);
              showToastMessage(toast, 'normal', 'Dralens suggested a reply. You can edit it before posting.');
            }
          }
        } catch (sugErr) {
          console.warn('AI suggestion error:', sugErr);
        } finally {
          setIsGeneratingSuggestion(false);
        }
      }
    } else {
      setReplyingToComment(null);
      const curComment = commentTextRef.current || '';
      const newComment = curComment.trim()
        ? (/@dralens\b/i.test(curComment) ? curComment : `@dralens ${curComment}`)
        : '@dralens ';
      commentTextRef.current = newComment;
      setCommentText(newComment);
      clearMentionState();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
    }
  }, [clearMentionState, postId, postText, postOwnerUsername, replyingToComment, buildImagePayload, toast, getRootCommentId]);

  const handleSubmitDralens = useCallback(async () => {
    const isTargetComment = Boolean(
      (replyingToComment?.id && replyingToComment.id !== postId) ||
      (askDralensTarget?.id && askDralensTarget.id !== postId)
    );
    const target = isTargetComment
      ? (askDralensTarget || replyingToComment)
      : {
          id: postId,
          username: postOwnerUsername || '',
          text: postText || '',
          parentId: null,
        };

    const activeText = (replyingToComment ? replyText : commentText) || replyText || commentText;
    const rawText = activeText.trim();
    if (!rawText) return;
    const userQuery = rawText.replace(/@dralens\s*/gi, '').trim() || rawText;
    if (isAskingDralens) return;

    Keyboard.dismiss();
    setIsAskingDralens(true);

    const threadId = isTargetComment ? getRootCommentId(target) : null;
    const tempUserCommentId = `temp-user-${Date.now()}`;
    const tempAiReplyId = `dralens-${Date.now()}`;

    // 1. Optimistically display user's question (matching Image 2)
    const optimisticUserComment = {
      id: tempUserCommentId,
      userId: currentUser?.id ?? userId,
      username: currentUser?.displayName || currentUser?.username || t('commentSheet.you') || 'You',
      avatar: currentUser?.avatar || profileImage || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
      text: rawText,
      time: t('commentSheet.justNow') || 'Just now',
      parentId: threadId,
      replies: [],
      isOptimistic: true,
    };

    if (threadId) {
      setComments(prev =>
        prev.map(c => {
          if (c.id === threadId) {
            return {
              ...c,
              replies: [...(c.replies || []), optimisticUserComment],
            };
          }
          return c;
        })
      );
      setExpandedReplies(prev => ({ ...prev, [threadId]: true }));
    } else {
      setComments(prev => [optimisticUserComment, ...prev]);
      onCommentCountUpdate?.(postId, comments.length + 1);
    }

    setReplyText('');
    setCommentText('');
    replyTextRef.current = '';
    commentTextRef.current = '';
    setReplyingToComment(null);
    setAskDralensTarget(null);
    clearMentionState();

    try {
      // 2. Post user question to Valens API
      let realUserCommentId = tempUserCommentId;
      try {
        const postRes = await postComment(postId, rawText, threadId);
        if (postRes?.success && postRes?.data?.id) {
          realUserCommentId = String(postRes.data.id);
        }
      } catch (postErr) {
        console.warn('postComment error for Dralens user question:', postErr);
      }

      // 3. Build image payload & call Dralens AI API
      const imagePayload = buildImagePayload();
      const response = await postDralensReply({
        postId,
        commentId: target.id,
        userQuery,
        postText: postText || '',
        authorUsername: target.username || postOwnerUsername || '',
        parentCommentContext: target.text || postText || '',
        image: imagePayload,
      });

      const isSuccess = response?.status === 'success' || response?.success === true || (response && !response?.error && !response?.message);
      if (!isSuccess || !response?.reply_text) {
        throw new Error(response?.message || 'Dralens request failed');
      }

      // 4. Construct Dralens AI reply object
      const aiReply = {
        id: tempAiReplyId,
        isDralensAi: true,
        userId: 'dralens-bot',
        username: response.bot_name || 'Dralens AI',
        avatar: 'dralens_ai',
        text: response.reply_text,
        time: t('commentSheet.justNow') || 'Just now',
        parentId: threadId || realUserCommentId,
        replies: [],
        likeCount: 0,
        dislikeCount: 0,
      };

      // 5. Save AI reply in AsyncStorage
      try {
        const storageKey = `@dralens_replies_${postId}`;
        const existingRaw = await AsyncStorage.getItem(storageKey);
        const existing = existingRaw ? JSON.parse(existingRaw) : [];
        existing.push({
          ...aiReply,
          parentCommentContext: rawText,
        });
        await AsyncStorage.setItem(storageKey, JSON.stringify(existing));
      } catch (storageErr) {
        console.warn('Failed to save Dralens reply to storage:', storageErr);
      }

      // 6. Update comments state to attach Dralens AI reply under the question
      setComments(prev => {
        return prev.map(c => {
          if (!threadId && (String(c.id) === String(tempUserCommentId) || String(c.id) === String(realUserCommentId))) {
            return {
              ...c,
              id: realUserCommentId,
              isOptimistic: false,
              replies: [...(c.replies || []).filter(r => r.id !== tempAiReplyId), aiReply],
            };
          }
          if (threadId && String(c.id) === String(threadId)) {
            const currentReplies = c.replies || [];
            const updatedReplies = currentReplies.map(r => {
              if (String(r.id) === String(tempUserCommentId) || String(r.id) === String(realUserCommentId)) {
                return {
                  ...r,
                  id: realUserCommentId,
                  isOptimistic: false,
                };
              }
              return r;
            });
            if (!updatedReplies.some(r => String(r.id) === String(tempAiReplyId) || String(r.id) === String(aiReply.id))) {
              updatedReplies.push(aiReply);
            }
            return {
              ...c,
              replies: updatedReplies,
            };
          }
          return c;
        });
      });

      // Expand the thread so reply is visible immediately (matching Image 2)
      setExpandedReplies(prev => ({
        ...prev,
        [realUserCommentId]: true,
        [tempUserCommentId]: true,
        ...(threadId ? { [threadId]: true } : {}),
      }));

      showToastMessage(toast, 'success', 'Dralens replied');
    } catch (error) {
      console.error('Dralens AI error:', error);
      showToastMessage(toast, 'danger', error?.message || 'Unable to ask Dralens');
    } finally {
      setIsAskingDralens(false);
    }
  }, [
    askDralensTarget,
    replyingToComment,
    replyText,
    commentText,
    isAskingDralens,
    postId,
    postText,
    postOwnerUsername,
    buildImagePayload,
    currentUser,
    userId,
    profileImage,
    comments.length,
    onCommentCountUpdate,
    toast,
    t,
  ]);

  const handleSubmitReply = useCallback(() => {
    const activeText = (replyingToComment ? replyText : commentText).trim();
    const isDralens = Boolean(askDralensTarget) || /@dralens\b/i.test(activeText);
    if (isDralens) {
      return handleSubmitDralens();
    }
    return handleSendComment();
  }, [askDralensTarget, replyingToComment, replyText, commentText, handleSendComment, handleSubmitDralens]);

  const handleToggleReplies = useCallback(commentId => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  }, []);

  const handleDeleteComment = useCallback(async () => {
    if (!selectedComment?.id) {
      showToastMessage(toast, 'danger', t('commentSheet.errorInvalidComment'));
      return;
    }

    const viewerId = String(currentUser?.id ?? userId ?? '');
    const isCommentAuthor =
      viewerId && String(selectedComment.userId) === viewerId;
    const isPostOwner =
      viewerId && postOwnerId != null && String(postOwnerId) === viewerId;

    if (!(isCommentAuthor || isPostOwner)) {
      showToastMessage(toast, 'danger', t('commentSheet.errorNoPermission'));
      return;
    }

    const commentId = selectedComment.id;
    if (isDeleting.has(commentId)) return;

    setComments(prev =>
      prev
        .filter(c => String(c.id) !== String(commentId))
        .map(c => ({
          ...c,
          replies: (c.replies || []).filter(r => String(r.id) !== String(commentId)),
        })),
    );
    onCommentCountUpdate?.(postId, Math.max(0, comments.length - 1));
    setIsDeleting(prev => new Set(prev).add(commentId));
    setIsModalVisible(false);

    try {
      const response = await deleteComment(commentId, postId);
      if (response.success) {
        showToastMessage(
          toast,
          'success',
          response.data?.message || t('commentSheet.successCommentDeleted'),
        );
        await fetchComments();
      } else {
        setComments(prev => [selectedComment, ...prev]);
        onCommentCountUpdate?.(postId, comments.length);
        showToastMessage(
          toast,
          'danger',
          response.data?.message || t('commentSheet.errorDeleteFailed'),
        );
      }
    } catch {
      setComments(prev => [selectedComment, ...prev]);
      onCommentCountUpdate?.(postId, comments.length);
      showToastMessage(toast, 'danger', t('commentSheet.errorDelete'));
    } finally {
      setIsDeleting(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
      setSelectedComment(null);
    }
  }, [
    selectedComment,
    currentUser?.id,
    userId,
    postOwnerId,
    isDeleting,
    postId,
    comments.length,
    fetchComments,
    onCommentCountUpdate,
    toast,
    t,
  ]);

  const handleEditComment = useCallback(() => {
    if (!selectedComment) return;
    setReplyingToComment(null);
    replyTextRef.current = '';
    setReplyText('');
    clearMentionState();
    commentTextRef.current = selectedComment.text;
    setCommentText(selectedComment.text);
    setEditingComment(selectedComment);
    setIsModalVisible(false);
    setSelectedComment(null);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [selectedComment, clearMentionState]);

  const handleCopyComment = useCallback(() => {
    const textToCopy = selectedComment?.text?.trim();
    if (!textToCopy) {
      setIsModalVisible(false);
      setSelectedComment(null);
      return;
    }

    Clipboard.setString(textToCopy);
    showToastMessage(toast, 'success', t('commentSheet.successCommentCopied'));
    setIsModalVisible(false);
    setSelectedComment(null);
  }, [selectedComment, toast, t]);

  const handleReportComment = useCallback(() => {
    const commentToReport = selectedComment;
    setIsModalVisible(false);
    setSelectedComment(null);
    if (!commentToReport) return;
    setReportingComment(commentToReport);
    setTimeout(() => {
      reportRef.current?.open();
    }, 250);
  }, [selectedComment]);

  // ─── reactions ───────────────────────────────────────────────────────────────

  const handleThumbsUpPress = useCallback(
    async commentId => {
      const current = commentVotes?.[commentId] || {
        thumbsUp: 0,
        thumbsDown: 0,
        userVote: null,
      };
      const isAlreadyVoted = current.userVote === 'up';
      const reaction = isAlreadyVoted ? 'NONE' : 'LIKE';

      setCommentVotes(prev => ({
        ...prev,
        [commentId]: {
          thumbsUp: isAlreadyVoted ? current.thumbsUp - 1 : current.thumbsUp + 1,
          thumbsDown:
            current.userVote === 'down' ? current.thumbsDown - 1 : current.thumbsDown,
          userVote: isAlreadyVoted ? null : 'up',
        },
      }));

      try {
        const response = await postCommentReaction({ commentId, reaction });
        if (!response.success) {
          showToastMessage(toast, 'danger', t('commentSheet.errorReactionFailed'));
        }
      } catch {
        showToastMessage(toast, 'danger', t('commentSheet.errorReaction'));
      }
    },
    [commentVotes, toast, t],
  );

  const handleThumbsDownPress = useCallback(
    async commentId => {
      const current = commentVotes?.[commentId] || {
        thumbsUp: 0,
        thumbsDown: 0,
        userVote: null,
      };
      const isAlreadyVoted = current.userVote === 'down';
      const reaction = isAlreadyVoted ? 'NONE' : 'DISLIKE';

      setCommentVotes(prev => ({
        ...prev,
        [commentId]: {
          thumbsUp:
            current.userVote === 'up' ? current.thumbsUp - 1 : current.thumbsUp,
          thumbsDown: isAlreadyVoted ? current.thumbsDown - 1 : current.thumbsDown + 1,
          userVote: isAlreadyVoted ? null : 'down',
        },
      }));

      try {
        const response = await postCommentReaction({ commentId, reaction });
        if (!response.success) {
          showToastMessage(toast, 'danger', t('commentSheet.errorReactionFailed'));
        }
      } catch {
        showToastMessage(toast, 'danger', t('commentSheet.errorReaction'));
      }
    },
    [commentVotes, toast, t],
  );

  // ─── list rendering ───────────────────────────────────────────────────────────

  const commentKeyExtractor = useCallback(item => item.id, []);

  const renderCommentItem = useCallback(
    ({ item }) => (
      <CommentItem
        item={item}
        onMorePress={openActionsFor}
        onCloseSheet={onClose}
        currentUserId={currentUser?.id ?? userId}
        postOwnerId={postOwnerId}
        returnTo={returnTo}
        returnParams={returnParams}
        onReplyPress={handleReplyPress}
        onAskDralens={handleAskDralens}
        expandedReplies={expandedReplies}
        onToggleReplies={handleToggleReplies}
        onThumbsUpPress={handleThumbsUpPress}
        onThumbsDownPress={handleThumbsDownPress}
        commentVotes={commentVotes}
      />
    ),
    [
      openActionsFor,
      onClose,
      currentUser?.id,
      userId,
      postOwnerId,
      returnTo,
      returnParams,
      handleReplyPress,
      handleAskDralens,
      expandedReplies,
      handleToggleReplies,
      handleThumbsUpPress,
      handleThumbsDownPress,
      commentVotes,
    ],
  );

  // ─── render ───────────────────────────────────────────────────────────────────

  // Spacer under the composer keeps the input above keyboard / home indicator.
  // Applied below the input (not on the outer sheet) so mention growth can't
  // push the TextInput under the keyboard.
  const bottomPad =
    keyboardOffset > 0 ? keyboardOffset : Math.max(insets.bottom, 16);
  // Keep mention panel compact when the keyboard is open (~2–3 rows).
  const mentionMaxHeight = keyboardOffset > 0 ? 120 : 220;

  return (
    <View style={[styles.container, bgStyle]}>
      <Text style={[styles.title, { color: labelColor }]}>
        {t('commentSheet.title', { count: comments.length })}
      </Text>

      <View style={styles.body}>
        {initialLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={accent} />
          </View>
        ) : comments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: mutedText }]}>
              {t('commentSheet.noComments')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={commentKeyExtractor}
            renderItem={renderCommentItem}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.commentsListContent}
            style={styles.commentsList}
          />
        )}
      </View>

      {/* Mention suggestions sit in-flow above the input so they never clip under it */}
      {activeMention ? (
        <View
          style={[
            styles.mentionPanel,
            {
              backgroundColor: card,
              borderColor: border,
              maxHeight: mentionMaxHeight,
            },
          ]}
        >
          {mentionLoading && mentionUsers.length === 0 ? (
            <View style={styles.mentionStatusRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[styles.mentionStatusText, { color: mutedText }]}>
                {t('commentSheet.mentionSearching')}
              </Text>
            </View>
          ) : !mentionLoading && mentionUsers.length === 0 ? (
            <Text style={[styles.mentionStatusText, { color: mutedText, padding: 12 }]}>
              {activeMention.query
                ? t('commentSheet.mentionNoUsers')
                : t('commentSheet.mentionSearching')}
            </Text>
          ) : (
            <FlatList
              keyboardShouldPersistTaps="always"
              nestedScrollEnabled
              data={mentionUsers.slice(0, 8)}
              keyExtractor={item => String(item.id)}
              style={{ maxHeight: mentionMaxHeight }}
              contentContainerStyle={styles.mentionListContent}
              showsVerticalScrollIndicator
              bounces={false}
              ListHeaderComponent={
                mentionLoading ? (
                  <View style={styles.mentionLoadingHint}>
                    <ActivityIndicator size="small" color={accent} />
                  </View>
                ) : null
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.mentionRow, { borderBottomColor: border }]}
                  onPress={() => handleSelectMention(item)}
                  activeOpacity={0.75}
                >
                  <HexAvatar
                    uri={item.avatar}
                    size={28}
                    borderWidth={1}
                    borderColor={accent}
                  />
                  <View style={styles.mentionMeta}>
                    <Text style={[styles.mentionName, { color: labelColor }]} numberOfLines={1}>
                      {item.displayName}
                    </Text>
                    <Text style={[styles.mentionHandle, { color: mutedText }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : null}

      {/* Composer pinned above keyboard spacer */}
      <View style={[styles.composerWrap, bgStyle]}>
        {replyingToComment && (
          <View
            style={[
              styles.replyingBar,
              {
                borderTopColor: border,
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
              },
            ]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={[styles.replyingBarText, { color: mutedText }]}
                numberOfLines={1}>
                {askDralensTarget ? 'Asking Dralens about ' : t('commentSheet.replyingTo')}{' '}
                <Text style={[styles.replyingBarUsername, { color: accent }]}>
                  @{replyingToComment.username}
                </Text>
              </Text>
              {isGeneratingSuggestion && (
                <View style={styles.suggestingPill}>
                  <ActivityIndicator size="small" color="#8B5CF6" style={{ transform: [{ scale: 0.7 }], marginRight: 4 }} />
                  <Text style={styles.suggestingPillText}>Suggesting reply...</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setReplyingToComment(null);
                setAskDralensTarget(null);
                replyTextRef.current = '';
                setReplyText('');
                clearMentionState();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={16} color={mutedText} />
            </TouchableOpacity>
          </View>
        )}
        {editingComment && (
          <View
            style={[
              styles.replyingBar,
              {
                borderTopColor: border,
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
              },
            ]}>
            <Text
              style={[styles.replyingBarText, { color: mutedText }]}
              numberOfLines={1}>
              {t('commentSheet.editCommentTitle') || 'Editing comment'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                commentTextRef.current = '';
                setCommentText('');
                clearMentionState();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={16} color={mutedText} />
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.inputRow, { borderTopColor: border }]}>
          <View style={styles.inputAvatar}>
            <HexAvatar
              uri={profileImage}
              size={30}
              borderWidth={1}
              borderColor={accent}
            />
          </View>
          <TextInput
            ref={inputRef}
            placeholder={
              editingComment
                ? t('commentSheet.editPlaceholder')
                : replyingToComment
                  ? t('commentSheet.replyPlaceholder', { username: replyingToComment.username })
                  : t('commentSheet.addCommentPlaceholder')
            }
            placeholderTextColor={mutedText}
            style={[
              styles.input,
              {
                color: labelColor,
                backgroundColor: inputSurface,
                borderColor: border,
              },
            ]}
            value={replyingToComment ? replyText : commentText}
            onChangeText={
              replyingToComment ? handleReplyTextChange : handleCommentTextChange
            }
            onSelectionChange={event => {
              const selection = event?.nativeEvent?.selection;
              if (!selection) return;
              if (replyingToComment) {
                replySelectionRef.current = selection;
                setReplySelection(selection);
                if (selection.start > replyTextRef.current.length) return;
                runMentionSearch(replyTextRef.current, selection.start, 'reply');
              } else {
                inputSelectionRef.current = selection;
                setInputSelection(selection);
                if (selection.start > commentTextRef.current.length) return;
                runMentionSearch(
                  commentTextRef.current,
                  selection.start,
                  'comment',
                );
              }
            }}
            editable={true}
          />
          <TouchableOpacity
            style={styles.askDralensButton}
            onPress={() => handleAskDralens(replyingToComment)}
            disabled={isPosting || isAskingDralens}
            accessibilityRole="button"
            accessibilityLabel="Ask Dralens">
            <Text style={styles.askDralensIcon}>✦</Text>
            <Text style={styles.askDralensText}>Ask{`\n`}Dralens</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmitReply}
            disabled={
              isPosting ||
              isAskingDralens ||
              !(replyingToComment ? replyText.trim() : commentText.trim())
            }>
            {isPosting || isAskingDralens ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <Text
                style={[
                  styles.sendText,
                  { color: accent },
                  !(replyingToComment
                    ? replyText.trim()
                    : commentText.trim()) && styles.sendTextDisabled,
                ]}>
                {editingComment
                  ? t('commentSheet.update')
                  : replyingToComment
                    ? (askDralensTarget || /@dralens\b/i.test(replyText) ? 'Ask' : t('commentSheet.reply'))
                    : (askDralensTarget || /@dralens\b/i.test(commentText) ? 'Ask' : t('commentSheet.send'))}
              </Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: bottomPad }} />
      </View>

      {/* Action modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsModalVisible(false);
          setSelectedComment(null);
        }}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: card }]}>
            <TouchableOpacity
              style={[styles.modalButton, { borderBottomColor: border, borderBottomWidth: 1 }]}
              onPress={handleCopyComment}
              disabled={!selectedComment?.text?.trim()}>
              <Text style={[styles.modalButtonText, { color: labelColor }]}>
                {t('commentSheet.copyComment')}
              </Text>
            </TouchableOpacity>

            {(selectedComment?.userId === String(currentUser?.id ?? userId) ||
              postOwnerId === String(currentUser?.id ?? userId)) && (
              <TouchableOpacity
                style={[styles.modalButton, { borderBottomColor: border, borderBottomWidth: 1 }]}
                onPress={handleDeleteComment}
                disabled={selectedComment && isDeleting.has(selectedComment.id)}>
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>
                  {selectedComment && isDeleting.has(selectedComment.id)
                    ? t('commentSheet.deleting')
                    : t('commentSheet.deleteComment')}
                </Text>
              </TouchableOpacity>
            )}

            {selectedComment?.userId === String(currentUser?.id ?? userId) && (
              <TouchableOpacity
                style={[styles.modalButton, { borderBottomColor: border, borderBottomWidth: 1 }]}
                onPress={handleEditComment}>
                <Text style={[styles.modalButtonText, { color: labelColor }]}>
                  {t('commentSheet.editComment')}
                </Text>
              </TouchableOpacity>
            )}

            {selectedComment?.userId !== String(currentUser?.id ?? userId) && (
              <TouchableOpacity
                style={[styles.modalButton, { borderBottomColor: border, borderBottomWidth: 1 }]}
                onPress={handleReportComment}>
                <Text style={[styles.modalButtonText, { color: '#EF4444' }]}>
                  {t('commentSheet.reportComment', 'Report Comment')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setIsModalVisible(false);
                setSelectedComment(null);
              }}>
              <Text style={[styles.modalButtonText, { color: mutedText }]}>
                {t('commentSheet.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ReportFlowScreen
        ref={reportRef}
        postId={reportingComment?.id || ''}
        reportedUserId={String(reportingComment?.userId || '').trim()}
        contentType="comment"
        feature={postText ? 'post' : 'comment'}
        onReported={() => {
          showToastMessage(toast, 'success', t('commentSheet.successCommentReported', 'Comment reported successfully'));
          setReportingComment(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dralensCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  dralensAvatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 10,
    marginTop: 2,
  },
  dralensNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dralensUsername: {
    fontSize: 13,
    fontWeight: '700',
  },
  aiBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
  dralensBubble: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 4,
  },
  dralensBubbleText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  dralensActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 2,
  },
  dralensActionLeftButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  suggestingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  suggestingPillText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  toggleRepliesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  toggleRepliesLine: {
    width: 22,
    height: 1.5,
    marginRight: 6,
    borderRadius: 1,
  },
  toggleRepliesText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dralensCopyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dralensCopyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dralensReplyCard: {
    borderLeftWidth: 2,
    borderLeftColor: '#A855F7',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 6,
  },

  container: {
    flex: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    flex: 1,
    minHeight: 0,
  },
  commentsList: {
    flex: 1,
  },
  commentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optimisticComment: {
    opacity: 0.6,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  hexAvatarWrap: {
    width: 32,
    height: 32,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontWeight: '600',
    fontSize: 14,
    marginRight: 6,
  },
  time: {
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    marginTop: 2,
  },
  commentActionsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  replyButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  votingContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
  },
  voteIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  voteIconActive: {
    opacity: 1,
  },
  voteCount: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.6,
  },
  voteCountActive: {
    fontWeight: '600',
    opacity: 1,
  },
  starIcon: {
    marginLeft: 8,
    alignSelf: 'center',
  },
  replyingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderRadius: 8,
    marginBottom: 4,
  },
  replyingBarText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  replyingBarUsername: {
    fontWeight: '700',
  },
  repliesSection: {
    marginTop: 10,
    marginLeft: 16,
  },
  replyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 14,
    padding: 10,
    marginTop: 8,
  },
  composerWrap: {
    flexShrink: 0,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 0,
    borderTopWidth: 1,
  },
  inputAvatar: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 12,
  },
  sendText: {
    fontWeight: '600',
    fontSize: 16,
  },
  sendTextDisabled: {
    opacity: 0.4,
  },
  askDralensButton: {
    minWidth: 56,
    minHeight: 38,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginHorizontal: 4,
    borderRadius: 14,
    backgroundColor: '#f1e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  askDralensIcon: {
    color: '#7138b8',
    fontSize: 17,
    marginRight: 3,
  },
  askDralensText: {
    color: '#7138b8',
    fontSize: 10,
    lineHeight: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
  },
  commentsListContent: {
    paddingBottom: 12,
    flexGrow: 1,
  },
  mentionPanel: {
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
  },
  mentionListContent: {
    paddingBottom: 4,
  },
  mentionLoadingHint: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  mentionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  mentionStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mentionMeta: {
    flex: 1,
  },
  mentionName: {
    fontSize: 14,
    fontWeight: '700',
  },
  mentionHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  modalContent: {
    borderRadius: 12,
    paddingVertical: 4,
    width: '80%',
    overflow: 'hidden',
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
