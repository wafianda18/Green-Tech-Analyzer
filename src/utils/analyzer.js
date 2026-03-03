import { ALL_CODES, ADDITIONAL_CODES } from '../data/codebook.js';

const EXCLUDE_SECTIONS = [
  'table of contents', 'contents', 'index', 'appendix', 'references', 
  'bibliography', 'glossary', 'daftar isi', 'daftar pustaka',
  'gri index', 'gri content index', 'sasb', 'data summary'
];

const INTENT_PATTERNS = [
  /\b(plan(s)? to|will|intend(s)? to|aim(s)? to|going to|expect(s)? to|hope(s)? to|target(s)? to|goal(s)? to|commit(s)? to)\b/i,
  /\b(by \d{4}|in the future|next year|upcoming|future initiatives?)\b/i,
  /\b(we are considering|we are exploring|we are evaluating|we are assessing)\b/i
];

const ACTION_VERB_PATTERNS = /\b(installed|implemented|reduced|replaced|recycled|reused|recovered|certified|achieved|deployed|adopted|operated|launched|introduced|established|obtained|conducted|performed|completed|delivered|produced|generated|converted|eliminated|substituted|redesigned|developed|created|built|initiated|began|started|maintained|organized)\b/i;

function isInExcludedSection(text) {
  const lowerText = text.toLowerCase();
  return EXCLUDE_SECTIONS.some(section => {
    const textWords = lowerText.split(/\s+/);
    return textWords.slice(0, 5).join(' ').includes(section);
  });
}

function hasIntentOnly(text) {
  return INTENT_PATTERNS.some(pattern => pattern.test(text));
}

function hasActionVerb(text) {
  return ACTION_VERB_PATTERNS.test(text);
}

function scoreCode(paragraph, codeEntry) {
  const text = paragraph.text.toLowerCase();
  
  // Check exclude patterns for this specific code
  for (const excludePattern of (codeEntry.excludePatterns || [])) {
    if (text.includes(excludePattern.toLowerCase())) {
      return { score: 0, matched: [], reason: `excluded pattern: ${excludePattern}` };
    }
  }
  
  // Count keyword matches
  let keywordMatches = [];
  for (const keyword of codeEntry.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      keywordMatches.push(keyword);
    }
  }
  
  if (keywordMatches.length === 0) return { score: 0, matched: [], reason: 'no keywords' };
  
  // Check if text has action verbs
  const hasAction = hasActionVerb(paragraph.text);
  
  // Check if it's intent only
  const isIntent = hasIntentOnly(paragraph.text) && !hasAction;
  
  let score = keywordMatches.length * 10;
  if (hasAction) score += 20;
  if (isIntent) score -= 50; // Heavy penalty for intent-only
  
  return {
    score: Math.max(0, score),
    matched: keywordMatches,
    hasAction,
    isIntent,
    reason: isIntent ? 'intent/plan only — no actual action' : null
  };
}

export function analyzeParagraphs(paragraphs) {
  const results = {
    codedParagraphs: [],
    uncoded: [],
    negativeCase: [],
    codeSummary: {},
    newCodes: []
  };
  
  // Initialize code summary
  for (const code of ALL_CODES) {
    results.codeSummary[code.id] = {
      code: code.code,
      stage: code.stage,
      count: 0,
      paragraphs: []
    };
  }
  
  const newCodeTracker = {};
  
  for (const paragraph of paragraphs) {
    // Skip excluded sections (ToC, index, etc.)
    if (isInExcludedSection(paragraph.text)) continue;
    
    // Skip very short paragraphs, headers, footers
    if (paragraph.text.length < 80) continue;
    
    // Skip table-of-contents-like content (many dots or short lines)
    if ((paragraph.text.match(/\.\.\./g) || []).length > 3) continue;
    
    const assignedCodes = [];
    const notCodedReasons = [];
    
    for (const codeEntry of ALL_CODES) {
      const { score, matched, hasAction, isIntent, reason } = scoreCode(paragraph, codeEntry);
      
      if (score > 0 && matched.length > 0) {
        if (isIntent) {
          // This is a negative case
          results.negativeCase.push({
            paragraphId: paragraph.id,
            text: paragraph.text,
            pageNum: paragraph.pageNum,
            code: codeEntry.code,
            reason: reason || 'Intent/plan stated but no actual action in report year',
            type: 'intent_only'
          });
          notCodedReasons.push({
            code: codeEntry.code,
            reason: `Intent/rencana saja — tidak ada tindakan nyata pada tahun laporan (ditemukan kata kunci: ${matched.slice(0, 2).join(', ')})`
          });
        } else if (score >= 10) {
          assignedCodes.push({
            codeId: codeEntry.id,
            code: codeEntry.code,
            stage: codeEntry.stage,
            score,
            matched,
            hasAction
          });
          
          // Track additional/new codes
          if (ADDITIONAL_CODES.find(c => c.id === codeEntry.id)) {
            if (!newCodeTracker[codeEntry.id]) newCodeTracker[codeEntry.id] = [];
            newCodeTracker[codeEntry.id].push(paragraph);
          }
        }
      }
    }
    
    if (assignedCodes.length > 0) {
      results.codedParagraphs.push({
        ...paragraph,
        codes: assignedCodes,
        note: ''
      });
      
      // Update code summary
      for (const assigned of assignedCodes) {
        if (results.codeSummary[assigned.codeId]) {
          results.codeSummary[assigned.codeId].count++;
          results.codeSummary[assigned.codeId].paragraphs.push(paragraph.id);
        }
      }
    } else {
      // Check if paragraph mentioned environmental keywords but wasn't coded
      const envKeywords = ['environment', 'sustainability', 'csr', 'green', 'carbon', 'emission', 'climate', 'eco'];
      const lowerText = paragraph.text.toLowerCase();
      const hasEnvKeyword = envKeywords.some(k => lowerText.includes(k));
      
      if (hasEnvKeyword && notCodedReasons.length === 0 && paragraph.text.length > 100) {
        // Determine why it wasn't coded
        let reason = 'Tidak memenuhi kriteria tindakan nyata';
        if (hasIntentOnly(paragraph.text)) {
          reason = 'Hanya berupa pernyataan komitmen, rencana, atau niat — bukan tindakan nyata';
        } else if (lowerText.includes('csr') || lowerText.includes('stakeholder') || lowerText.includes('survey')) {
          reason = 'CSR governance/stakeholder engagement — bukan tindakan teknologi hijau';
        } else if (lowerText.includes('strategy') || lowerText.includes('vision') || lowerText.includes('goal')) {
          reason = 'Pernyataan strategi/visi/tujuan — bukan implementasi aktual';
        }
        
        notCodedReasons.push({ reason });
        results.uncoded.push({
          ...paragraph,
          notCodedReasons,
          hasEnvKeyword: true
        });
      }
    }
  }
  
  // Compile new codes
  for (const [codeId, paragraphList] of Object.entries(newCodeTracker)) {
    const codeEntry = ADDITIONAL_CODES.find(c => c.id === codeId);
    results.newCodes.push({
      code: codeEntry.code,
      count: paragraphList.length,
      paragraphs: paragraphList
    });
  }
  
  return results;
}

export function buildStageSummary(codeSummary) {
  const stages = {
    1: { codes: [], total: 0, count: 0 },
    2: { codes: [], total: 0, count: 0 },
    3: { codes: [], total: 0, count: 0 },
    4: { codes: [], total: 0, count: 0 },
    null: { codes: [], total: 0, count: 0 }
  };
  
  for (const [id, data] of Object.entries(codeSummary)) {
    const stage = data.stage ?? null;
    const key = stage ?? null;
    if (stages[key] !== undefined) {
      stages[key].codes.push({ id, ...data });
      stages[key].total += data.count;
      if (data.count > 0) stages[key].count++;
    }
  }
  
  return stages;
}

export function detectReportName(pages) {
  const firstPage = pages[0]?.text || '';
  const secondPage = pages[1]?.text || '';
  const combined = (firstPage + ' ' + secondPage).substring(0, 500);
  return combined.trim();
}

export function detectYear(pages) {
  const firstPages = pages.slice(0, 3).map(p => p.text).join(' ');
  const yearMatch = firstPages.match(/20\d{2}/);
  return yearMatch ? yearMatch[0] : new Date().getFullYear().toString();
}
