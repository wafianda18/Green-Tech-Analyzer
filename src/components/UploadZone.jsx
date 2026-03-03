import { useState, useRef } from 'react';
import styles from './UploadZone.module.css';

export default function UploadZone({ onFileSelected, isLoading }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      onFileSelected(file);
    }
  };

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelected(file);
  };

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dragging : ''} ${isLoading ? styles.loading : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleChange}
        className={styles.hiddenInput}
        disabled={isLoading}
      />

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>Mengekstrak & menganalisis PDF...</p>
            <p className={styles.loadingSubtext}>Proses ini mungkin memakan beberapa menit</p>
          </div>
        ) : (
          <>
            <div className={styles.iconWrap}>
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                <rect width="52" height="52" rx="14" fill="var(--accent-pale)" />
                <path d="M18 32V34C18 35.1 18.9 36 20 36H32C33.1 36 34 35.1 34 34V32" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round"/>
                <path d="M26 16V28M26 16L22 20M26 16L30 20" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className={styles.mainText}>Seret & lepas file PDF laporan keberlanjutan</p>
            <p className={styles.subText}>atau <span className={styles.link}>klik untuk memilih file</span></p>
            <p className={styles.hint}>Sustainability Report / Data Book / Annual Report (PDF)</p>
          </>
        )}
      </div>
    </div>
  );
}
