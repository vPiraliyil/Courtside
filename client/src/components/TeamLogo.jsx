import { useState } from 'react';
import { getTeamLogoUrl } from '../lib/teamLogos';

export default function TeamLogo({ teamName, size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const url = getTeamLogoUrl(teamName);

  if (!url || failed) return null;

  return (
    <img
      src={url}
      alt={`${teamName} logo`}
      width={size}
      height={size}
      className={`object-contain flex-shrink-0 ${className}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
