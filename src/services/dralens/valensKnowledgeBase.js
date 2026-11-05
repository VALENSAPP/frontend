/**
 * Valens Knowledge Base & Verified Feature Guide
 * Authoritative source of truth for Dralens AI.
 */

export const VALENS_KNOWLEDGE_BASE = [
  {
    id: 'pagbank_payouts',
    keywords: ['pagbank', 'payout', 'payouts', 'withdraw', 'earnings', 'receive earnings', 'bank account', 'connect pagbank'],
    question: 'How do I connect my PagBank account to receive my earnings?',
    intro: 'I can help you with that!\nTo connect your PagBank account, follow these steps:',
    steps: [
      'Go to Settings > Payouts',
      'Select PagBank',
      'Log in to your PagBank account',
      'Authorize the connection',
      "Your account will be linked and you'll be ready to receive your earnings.",
    ],
    outro: 'Once connected, your payouts will be processed directly to your PagBank account according to the payout schedule.'
  },
  {
    id: 'post_mission',
    keywords: ['mission', 'post mission', 'how do i post a mission', 'create mission', 'mission credit', 'mission credits'],
    question: 'How do I post a Mission?',
    intro: 'Posting a Mission is quick and easy! Here is how you can do it:',
    steps: [
      'Open the left menu and tap "Buy Mission Credits" if you need credits',
      'Go to the Create Post screen from the bottom navigation bar (+)',
      'Toggle the "Mission Post" switch on your post',
      'Set the reward points, task instructions, and expiration timer',
      'Tap "Publish" to broadcast your mission to the Valens community.',
    ],
    outro: 'Users who complete your mission tasks will earn points from your allocated reward pool!'
  },
  {
    id: 'sell_closet',
    keywords: ['closet', 'my closet', 'sell', 'sell item', 'how do i sell an item in my closet', 'shop', 'listing'],
    question: 'How do I sell an item in My Closet?',
    intro: 'Selling your wardrobe on Valens is simple! Follow these steps:',
    steps: [
      'Open the left drawer menu and select "My Closet"',
      'Tap "Add New Item" in Item Management',
      'Upload high-quality photos of your clothing or accessory',
      'Add a title, description, size, brand, and set the condition',
      'Set your price and choose shipping or local pickup options',
      'Tap "Publish Item" to make it live in your closet shop.',
    ],
    outro: 'You will receive an in-app notification whenever a buyer places an order.'
  },
  {
    id: 'create_service',
    keywords: ['service', 'services', 'create service', 'how do i create a service', 'freelance', 'offer service'],
    question: 'How do I create a Service?',
    intro: 'You can offer your professional skills and services directly on Valens:',
    steps: [
      'Open the left drawer menu and navigate to "Services"',
      'Tap "Create Service" (or join the provider waitlist if previewing)',
      'Choose your category (Design, Consulting, Video, Coaching, etc.)',
      'Define your scope of work, turnaround time, and revisions',
      'Set your fixed pricing or hourly rate',
      'Review your service card and tap "Publish Service".',
    ],
    outro: 'Clients can book and pay securely through Valens Escrow.'
  },
  {
    id: 'color_together',
    keywords: ['color together', 'battle', 'battles', 'invite friends', 'how do i invite friends to color together', 'canvas'],
    question: 'How do I invite friends to Color Together?',
    intro: 'Color Together lets you collaborate and battle creatively with friends:',
    steps: [
      'Navigate to the Battles / Color Together hub from your Profile or Explore tab',
      'Choose an open canvas battle or tap "Create Battle"',
      'Tap the "Invite Friends" button on the canvas header',
      'Select mutual followers from your list or copy your direct battle link',
      'Once your friends accept the invite, you can color and compete in real time!',
    ],
    outro: 'Community members can vote on the final artwork to determine the winner!'
  },
  {
    id: 'ebook',
    keywords: ['ebook', 'ebooks', 'publish ebook', 'buy ebook', 'read ebook', 'pdf', 'digital book'],
    question: 'How do I publish or purchase an Ebook?',
    intro: 'Valens supports creator digital publications and ebooks:',
    steps: [
      'Open the left drawer menu and select "Ebook (NEW)"',
      'To Publish: Tap "Publish Ebook", enter title & description, upload your PDF/EPUB, set the price, and publish',
      'To Purchase: Browse the Ebook Marketplace, select a title, and checkout via card or wallet balance',
      'Purchased ebooks are instantly accessible in your personal library for offline reading.',
    ],
  },
  {
    id: 'private_circle',
    keywords: ['private circle', 'vip', 'subscribers', 'exclusive', 'private content'],
    question: 'What is Private Circle and how do I set it up?',
    intro: 'Private Circle allows creators to share exclusive content with dedicated subscribers:',
    steps: [
      'Open the left drawer menu and tap "Private Circle"',
      'Set your monthly subscription price and perks',
      'Publish posts, stories, or reels with the "Private Circle Only" visibility',
      'Subscribers get access to your private feed and exclusive direct messaging.',
    ],
  },
  {
    id: 'stripe_payouts',
    keywords: ['stripe', 'stripe payout', 'credit card payout', 'bank transfer'],
    question: 'How do I set up Stripe for payouts?',
    intro: 'To receive global payouts via Stripe:',
    steps: [
      'Go to Settings > Payouts & Banking',
      'Select Stripe as your payout provider',
      'Complete the secure Stripe Onboarding verification with your bank details',
      'Once verified, your earnings will automatically transfer on the scheduled payout day.',
    ],
  },
  {
    id: 'dark_mode',
    keywords: ['dark mode', 'theme', 'light mode', 'dark theme'],
    question: 'How do I enable or disable Dark Mode?',
    intro: 'You can switch between light and dark mode at any time:',
    steps: [
      'Open the left drawer menu by swiping from the left or tapping the menu icon',
      'Scroll to the bottom of the drawer',
      'Toggle the "Dark Mode" switch on or off',
      'The entire app theme will update instantly to match your preference.',
    ],
  },
];

/**
 * Searches the local knowledge base for the best matching response.
 * @param {string} query 
 * @returns {object|null}
 */
export function findKnowledgeBaseMatch(query) {
  if (!query || typeof query !== 'string') return null;
  const clean = query.toLowerCase().trim();

  // 1. Exact or high-confidence match on keywords
  for (const item of VALENS_KNOWLEDGE_BASE) {
    for (const kw of item.keywords) {
      if (clean.includes(kw)) {
        return item;
      }
    }
  }

  // 2. Partial word match score
  let bestMatch = null;
  let maxScore = 0;
  const tokens = clean.split(/\s+/).filter(w => w.length > 2);

  for (const item of VALENS_KNOWLEDGE_BASE) {
    let score = 0;
    for (const token of tokens) {
      if (item.keywords.some(k => k.includes(token))) score += 2;
      if (item.question.toLowerCase().includes(token)) score += 3;
      if (item.intro.toLowerCase().includes(token)) score += 1;
    }
    if (score > maxScore && score >= 3) {
      maxScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}
