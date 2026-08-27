import { useState, useRef } from 'react';
import styles from './UploadZone.module.css';

const PDF_MIME = 'application/pdf';

function isPdf(file) {
  // Some browsers report an empty type for drag-and-dropped files.
  return file.type === PDF_MIME || /\.pdf$/i.test(file.name);
}

export default function UploadZone({ onFileSelected, onInvalidFile, isLoading, progress }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const accept = (file) => {
    if (!file) return;
    if (!isPdf(file)) {
      onInvalidFile?.(`"${file.name}" bukan file PDF. Pilih file berformat .pdf.`);
      return;
    }
    onFileSelected(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isLoading) return;
    accept(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => {
    accept(e.target.files[0]);
    // Reset so re-selecting the same file still fires a change event.
    e.target.value = '';
  };

  const openPicker = () => {
    if (!isLoading) inputRef.current?.click();
  };

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dragging : ''} ${isLoading ? styles.loading : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); if (!isLoading) setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={openPicker}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openPicker();
        }
      }}
      role="button"
      tabIndex={isLoading ? -1 : 0}
      aria-busy={isLoading}
      aria-label="Upload file PDF laporan keberlanjutan"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleChange}
        // The input lives inside the clickable zone, so its programmatic
        // click would bubble back into openPicker.
        onClick={(e) => e.stopPropagation()}
        className={styles.hiddenInput}
        disabled={isLoading}
        tabIndex={-1}
      />

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.loadingText}>
              {progress || 'Mengekstrak & menganalisis PDF...'}
            </p>
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
