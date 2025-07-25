type Badge = {
  type: string;
  expires_at: string | null;
};

/** 🔶 Priorities for each display feature */
const NAME_STYLE_PRIORITY = ['vip', 'early_adopter', 'dev', 'verified'];
const BUBBLE_STYLE_PRIORITY = ['dev', 'verified', 'mod'];
const ENTRANCE_EFFECT_PRIORITY = ['early_adopter', 'mod', 'vip'];

export function getNameStyleFromBadges(badges: Badge[]): string {
  const now = new Date();
  const activeTypes = badges
    .filter(b => !b.expires_at || new Date(b.expires_at) > now)
    .map(b => b.type);

  for (const badgeType of NAME_STYLE_PRIORITY) {
    if (activeTypes.includes(badgeType)) {
      if (badgeType === 'vip') return 'vip';
      if (badgeType === 'early_adopter') return 'gradient';
      if (badgeType === 'dev') return 'dev-glow';
      if (badgeType === 'verified') return 'blue-check';
    }
  }

  return 'default';
}

export function getBubbleStyleFromBadges(badges: Badge[]): string {
  const now = new Date();
  const activeTypes = badges
    .filter(b => !b.expires_at || new Date(b.expires_at) > now)
    .map(b => b.type);

  for (const badgeType of BUBBLE_STYLE_PRIORITY) {
    if (activeTypes.includes(badgeType)) {
      if (badgeType === 'dev') return 'neon-border';
      if (badgeType === 'verified') return 'solid-border';
      if (badgeType === 'mod') return 'pulse-glow';
    }
  }

  return 'default';
}

export function getEntranceEffectFromBadges(badges: Badge[]): string {
  const now = new Date();
  const activeTypes = badges
    .filter(b => !b.expires_at || new Date(b.expires_at) > now)
    .map(b => b.type);

  for (const badgeType of ENTRANCE_EFFECT_PRIORITY) {
    if (activeTypes.includes(badgeType)) {
      if (badgeType === 'early_adopter') return 'flash-slide';
      if (badgeType === 'mod') return 'zoom-blur';
      if (badgeType === 'vip') return 'fade-glow';
    }
  }

  return 'none';
}
