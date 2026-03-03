import { CODEBOOK, ADDITIONAL_CODES, STAGE_COLORS } from '../data/codebook.js';

export function exportToCSV(analysisResult, metadata) {
  const rows = [];
  
  // Header
  rows.push([
    'Nama Perusahaan', 'Kode Perusahaan', 'Negara', 'Wilayah', 'Jenis Industri',
    'Nama Laporan', 'Tahun Laporan', 'Stage', 'Code', 'Jumlah Paragraf', 'Jumlah Code Dikoding',
    'Contoh Paragraf (Page)', 'Notes'
  ]);
  
  const { codeSummary } = analysisResult;
  
  for (const stageData of Object.values(CODEBOOK)) {
    let stageTotal = 0;
    let stageCodeCount = 0;
    
    for (const codeEntry of stageData.codes) {
      const summary = codeSummary[codeEntry.id];
      if (!summary) continue;
      
      stageTotal += summary.count;
      if (summary.count > 0) stageCodeCount++;
      
      const exampleParagraphs = analysisResult.codedParagraphs
        .filter(p => p.codes.some(c => c.codeId === codeEntry.id))
        .slice(0, 2)
        .map(p => `[p.${p.pageNum}] ${p.text.substring(0, 80)}...`)
        .join(' | ');
      
      rows.push([
        metadata.companyName || '',
        metadata.companyCode || '',
        metadata.country || '',
        metadata.region || '',
        metadata.industry || '',
        metadata.reportName || '',
        metadata.reportYear || '',
        `Stage ${codeEntry.stage}`,
        codeEntry.code,
        summary.count,
        stageCodeCount,
        exampleParagraphs,
        ''
      ]);
    }
  }
  
  // Additional codes
  for (const codeEntry of ADDITIONAL_CODES) {
    const summary = codeSummary[codeEntry.id];
    if (!summary || summary.count === 0) continue;
    
    rows.push([
      metadata.companyName || '',
      metadata.companyCode || '',
      metadata.country || '',
      metadata.region || '',
      metadata.industry || '',
      metadata.reportName || '',
      metadata.reportYear || '',
      'Additional',
      codeEntry.code,
      summary.count,
      1,
      '',
      'New emerging code'
    ]);
  }
  
  const csvContent = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
  
  return csvContent;
}

export function downloadCSV(content, filename) {
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportFullReport(analysisResult, metadata) {
  const lines = [];
  
  lines.push(`GREEN TECHNOLOGY ANALYSIS REPORT`);
  lines.push(`${'='.repeat(60)}`);
  lines.push(`Nama Perusahaan  : ${metadata.companyName || 'N/A'}`);
  lines.push(`Kode Perusahaan  : ${metadata.companyCode || 'N/A'}`);
  lines.push(`Negara           : ${metadata.country || 'N/A'}`);
  lines.push(`Wilayah          : ${metadata.region || 'N/A'}`);
  lines.push(`Jenis Industri   : ${metadata.industry || 'N/A'}`);
  lines.push(`Nama Laporan     : ${metadata.reportName || 'N/A'}`);
  lines.push(`Tahun Laporan    : ${metadata.reportYear || 'N/A'}`);
  lines.push('');
  
  lines.push(`KLASIFIKASI BERDASARKAN CODEBOOK`);
  lines.push(`${'-'.repeat(60)}`);
  
  const { codeSummary } = analysisResult;
  
  for (const [stageKey, stageData] of Object.entries(CODEBOOK)) {
    let stageTotal = 0;
    let stageCodeCount = 0;
    const stageLines = [];
    
    for (const codeEntry of stageData.codes) {
      const summary = codeSummary[codeEntry.id];
      const count = summary?.count || 0;
      stageTotal += count;
      if (count > 0) stageCodeCount++;
      stageLines.push(`  ${codeEntry.code.padEnd(45)} ${count}`);
    }
    
    lines.push(`\n${stageData.label} (${stageCodeCount} codes active)`);
    lines.push(...stageLines);
    lines.push(`  ${'Total'.padEnd(45)} ${stageTotal}`);
  }
  
  lines.push('');
  lines.push(`KEMUNCULAN CODE BARU`);
  lines.push(`${'-'.repeat(60)}`);
  if (analysisResult.newCodes.length > 0) {
    for (const nc of analysisResult.newCodes) {
      lines.push(`  ${nc.code}: ${nc.count} paragraphs`);
    }
  } else {
    lines.push('  Tidak ada code baru');
  }
  
  lines.push('');
  lines.push(`NEGATIVE CASES`);
  lines.push(`${'-'.repeat(60)}`);
  if (analysisResult.negativeCase.length > 0) {
    const limitedCases = analysisResult.negativeCase.slice(0, 10);
    for (const nc of limitedCases) {
      lines.push(`  [Page ${nc.pageNum}] Code: ${nc.code}`);
      lines.push(`  Reason: ${nc.reason}`);
      lines.push(`  Text: ${nc.text.substring(0, 150)}...`);
      lines.push('');
    }
  } else {
    lines.push('  Tidak ada negative case teridentifikasi');
  }
  
  return lines.join('\n');
}
