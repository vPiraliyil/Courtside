export default function Avatar({ username, size = 40, className = '' }) {
  const url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username ?? '?')}&backgroundColor=1a1a1a&textColor=ffffff&fontSize=40`;
  return (
    <img
      src={url}
      alt={username}
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
      draggable={false}
    />
  );
}
