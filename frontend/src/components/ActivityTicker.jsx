import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const ICONS = { mint: '🔥', sale: '💰', bid: '⬆️', pvp: '⚔️', gift: '🎁', list: '🏷️', transfer: '📤' };

export default function ActivityTicker() {
  const feed = useStore(s => s.activityFeed);
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollLeft = 0;
  }, [feed.length]);

  if (!feed.length) return null;

  const formatItem = (item) => {
    const icon = ICONS[item.type] || '✦';
    const d = item.details || {};
    switch (item.type) {
      case 'mint':   return `${icon} ${item.actor} minted ${d.rarity} ${d.model} #${d.serial}`;
      case 'sale':   return `${icon} ${d.buyer} bought ${d.model} from ${d.seller} for ${d.price} SVT`;
      case 'pvp':    return `${icon} ${item.actor} beat ${d.loser} for ${d.amount} SVT`;
      case 'gift':   return `${icon} ${item.actor} gifted ${d.model} #${d.serial} to ${d.to}`;
      case 'list':   return `${icon} ${item.actor} listed ${d.model} for ${d.price} SVT`;
      case 'bid':    return `${icon} ${item.actor} bid ${d.amount} SVT`;
      default:       return `${icon} ${item.actor}`;
    }
  };

  const items = [...feed, ...feed, ...feed]; // triple for seamless loop

  return (
    <div className="ticker-wrapper">
      <div className="ticker-track">
        {items.map((item, i) => (
          <span key={i} className="ticker-item">{formatItem(item)}</span>
        ))}
      </div>
    </div>
  );
}
