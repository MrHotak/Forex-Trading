import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { tradesApi } from '../services/endpoints.js';

/** Screenshots require the login token, so they are fetched as blobs instead of plain <img src>. */
export default function SecureImage({ tradeId, attachment, className = '', onClick, alt }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    tradesApi
      .attachmentBlob(tradeId, attachment.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [tradeId, attachment.id]);

  if (failed) {
    return (
      <div className={`img-fallback ${className}`}>
        <ImageOff size={22} />
      </div>
    );
  }
  if (!url) return <div className={`img-fallback skeleton ${className}`} />;
  return <img src={url} alt={alt || attachment.fileName} className={className} onClick={onClick} loading="lazy" />;
}
