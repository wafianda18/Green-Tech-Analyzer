import { INDUSTRIES, REGIONS } from '../data/codebook.js';
import styles from './MetadataForm.module.css';

export default function MetadataForm({ metadata, onChange, isProfiling }) {
  const handle = (field) => (e) => onChange({ ...metadata, [field]: e.target.value });
  const handleCheck = (field) => (e) => onChange({ ...metadata, [field]: e.target.checked });

  return (
    <div className={styles.form}>
      <h3 className={styles.formTitle}>Informasi Laporan</h3>
      <p className={styles.formDesc}>
        {isProfiling
          ? 'Mengisi otomatis dari sampul laporan… field tetap dapat diubah.'
          : 'Lengkapi data perusahaan sebelum menganalisis. Beberapa field dapat terisi otomatis dari nama file dan isi laporan.'}
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Nama Perusahaan *</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Contoh: Ajinomoto Co Inc"
            value={metadata.companyName}
            onChange={handle('companyName')}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Kode Perusahaan</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Diambil dari nama file"
            value={metadata.companyCode}
            onChange={handle('companyCode')}
          />
          <span className={styles.hint}>Contoh: 2802-T dari &quot;2802-T_2022_SDB.pdf&quot;</span>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Negara *</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Contoh: Japan"
            value={metadata.country}
            onChange={handle('country')}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Wilayah *</label>
          <select className={styles.select} value={metadata.region} onChange={handle('region')}>
            <option value="">— Pilih Wilayah —</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Jenis Industri *</label>
          <select className={styles.select} value={metadata.industry} onChange={handle('industry')}>
            <option value="">— Pilih Industri —</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Tahun Laporan</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Contoh: 2022"
            value={metadata.reportYear}
            onChange={handle('reportYear')}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Nama Laporan</label>
          <input
            className={styles.input}
            type="text"
            placeholder="Contoh: Sustainability Data Book 2022"
            value={metadata.reportName}
            onChange={handle('reportName')}
          />
        </div>

        <div className={`${styles.field} ${styles.fullWidth}`}>
          <label className={styles.label}>Opsi Analisis</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={!!metadata.useAI}
              onChange={handleCheck('useAI')}
            />
            <span>Gunakan AI untuk ringkasan insight</span>
          </label>
          <span className={styles.hint}>Membuat ringkasan otomatis berdasarkan hasil coding. Kunci API dibutuhkan di server.</span>
        </div>
      </div>
    </div>
  );
}
