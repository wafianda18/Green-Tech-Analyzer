export const CODEBOOK = {
  stage1: {
    label: 'Stage 1',
    color: '#9b1d20',
    bg: '#fde8e8',
    codes: [
      {
        id: '1_end_of_pipe',
        code: '1 End-of-pipe',
        stage: 1,
        definition: 'Teknologi untuk mengontrol polusi di akhir proses untuk menangkap/menangani limbah sebelum dibuang',
        keywords: ['scrubber', 'electrostatic precipitator', 'esp', 'dust collector', 'wastewater treatment', 'wwtp', 'etp', 'activated carbon filter', 'nox', 'sox reduction', 'oil separator', 'limbah b3', 'flue gas', 'exhaust treatment', 'effluent treatment', 'emission control', 'pollution control', 'chimney filter', 'bag filter', 'cyclone separator'],
        actionVerbs: ['installed', 'implemented', 'deployed', 'operated', 'treated', 'controlled', 'captured', 'removed', 'filtered', 'reduced emissions'],
        excludePatterns: ['plan to', 'will install', 'intend to', 'considering']
      },
      {
        id: '1_remediation',
        code: '1 Remediation',
        stage: 1,
        definition: 'Pemulihan tanah dan/atau air dari kerusakan yang sudah terjadi',
        keywords: ['soil remediation', 'groundwater remediation', 'site cleanup', 'site clean-up', 'contaminated soil', 'contaminated water', 'legacy waste', 'chemical spill', 'dredging', 'contaminated sludge', 'polluted groundwater', 'land restoration', 'bioremediation'],
        actionVerbs: ['remediated', 'cleaned up', 'restored', 'removed', 'treated contaminated', 'rehabilitated'],
        excludePatterns: ['plan to', 'will remediate', 'intend to']
      }
    ]
  },
  stage2: {
    label: 'Stage 2',
    color: '#c77b2a',
    bg: '#fef3e2',
    codes: [
      {
        id: '2_source_reduction',
        code: '2 Source Reduction',
        stage: 2,
        definition: 'Mengurangi/menghilangkan konsumsi bahan baku dan energi pada sumbernya melalui optimasi proses',
        keywords: ['source reduction', 'energy reduction', 'water reduction', 'resource efficiency', 'energy conservation', 'energy saving', 'less water', 'reduce consumption', 'energy intensity', 'water intensity', 'resource consumption', 'process optimization', 'efficient', 'reduced energy', 'reduced water', 'reduced raw material', 'fermentation technology', 'fewer resources', 'energy-efficient', 'conservation'],
        actionVerbs: ['reduced', 'decreased', 'lowered', 'optimized', 'improved efficiency', 'saved', 'conserved', 'minimized', 'cut'],
        excludePatterns: ['target', 'goal to reduce', 'aim to', 'plan to reduce']
      },
      {
        id: '2_hazardous_reduction',
        code: '2 Reduce of Hazardous Materials',
        stage: 2,
        definition: 'Mengurangi/menghilangkan penggunaan bahan kimia berbahaya dan/atau limbah berbahaya dalam proses produksi',
        keywords: ['hazardous', 'toxic', 'CFC', 'voc', 'volatile organic', 'harmful chemical', 'dangerous substance', 'heavy metal', 'mercury', 'lead', 'cadmium', 'chromium', 'pesticide', 'reformulated', 'substitute material', 'non-toxic', 'voc-free', 'titanium dioxide', 'safer chemical', 'chemical substitution', 'elimination of hazardous'],
        actionVerbs: ['eliminated', 'replaced', 'substituted', 'reformulated', 'reduced use of', 'phased out', 'removed hazardous'],
        excludePatterns: ['plan to eliminate', 'will replace', 'aim to reduce']
      },
      {
        id: '2_recycling',
        code: '2 Recycling/Material Reuse',
        stage: 2,
        definition: 'Mengolah kembali material/limbah menjadi bahan/produk baru untuk mengurangi limbah dan penggunaan sumber daya baru',
        keywords: ['recycling', 'recycle', 'reuse', 'reused', 'by-product', 'byproduct', 'waste utilization', 'material recovery', 'circular', 'closed loop', 'reverse logistics return', 'waste sorting', 'process water recycling', 'bio-cycle', 'composting', 'upcycling', 'repurpose', 'salvage', 'reclaimed', 'recovered material', 'waste-to-resource', 'fertilizer from waste'],
        actionVerbs: ['recycled', 'reused', 'recovered', 'converted waste', 'utilized by-product', 'repurposed', 'composted'],
        excludePatterns: ['plan to recycle', 'goal to achieve zero waste']
      },
      {
        id: '2_remanufacturing',
        code: '2 Remanufacturing',
        stage: 2,
        definition: 'Proses manufaktur ulang yang melibatkan teknologi untuk membongkar, merakit kembali dan desain produk dengan komponen yang dapat dipertukarkan',
        keywords: ['remanufacturing', 'remanufactured', 'refurbish', 'refurbished', 'reassembly', 'disassembly', 'modular design', 'component replacement', 'rebuild', 'overhauled', 'reconditioned', 'spare parts recovery', 'end-of-life product', 'product return program'],
        actionVerbs: ['remanufactured', 'refurbished', 'reassembled', 'rebuilt', 'reconditioned'],
        excludePatterns: ['plan to', 'will remanufacture']
      },
      {
        id: '2_green_logistics',
        code: '2 Green Logistics',
        stage: 2,
        definition: 'Meminimalkan dampak lingkungan dari aktivitas logistik (transportasi, gudang, kemasan), mengelola aliran maju dan balik',
        keywords: ['green logistics', 'low emission vehicle', 'electric vehicle', 'biodiesel', 'modal shift', 'route optimization', 'packaging reduction', 'packaging weight', 'distribution center', 'consolidated distribution', 'freight', 'shipping emission', 'transport emission', 'co2 logistics', 'eco-driving', 'green fleet', 'lightweight packaging', 'packaging size', 'less packaging', 'digitization of slips'],
        actionVerbs: ['optimized routes', 'reduced packaging', 'shifted to', 'consolidated', 'digitized', 'standardized packaging', 'deployed electric'],
        excludePatterns: ['plan to optimize', 'considering', 'will shift']
      },
      {
        id: '2_housekeeping',
        code: '2 Housekeeping',
        stage: 2,
        definition: 'Merapikan, membersihkan, mengelola material dan perawatan rutin di fasilitas untuk mencegah bahaya dan polusi',
        keywords: ['housekeeping', 'high-pressure cleaning', 'vacuum', 'workplace organization', '5s', 'kaizen', 'preventive maintenance', 'spill prevention', 'leak prevention', 'material handling', 'storage management', 'good housekeeping practice', 'facility maintenance', 'clean production'],
        actionVerbs: ['maintained', 'organized', 'cleaned', 'prevented spills', 'implemented 5s'],
        excludePatterns: ['plan to implement', 'will organize']
      }
    ]
  },
  stage3: {
    label: 'Stage 3',
    color: '#2d6a4f',
    bg: '#d8f3dc',
    codes: [
      {
        id: '3_lca',
        code: '3 LCA',
        stage: 3,
        definition: 'Analisis dampak lingkungan produk/proses di sepanjang siklus hidupnya',
        keywords: ['life cycle assessment', 'lca', 'cradle-to-grave', 'cradle to grave', 'cradle-to-gate', 'lifecycle', 'life cycle impact', 'eco-indicator', 'iso 14040', 'iso 14044', 'lc-co2', 'life cycle analysis', 'environmental impact assessment', 'full life cycle', 'product life cycle'],
        actionVerbs: ['conducted lca', 'performed lca', 'assessed life cycle', 'calculated environmental impact', 'evaluated lifecycle'],
        excludePatterns: ['plan to perform lca', 'will conduct lca', 'going forward', 'plans to perform']
      },
      {
        id: '3_dfe',
        code: '3 DfE',
        stage: 3,
        definition: 'Perancangan produk/proses untuk meminimalkan dampak lingkungan',
        keywords: ['design for environment', 'dfe', 'eco-design', 'ecodesign', 'green design', 'sustainable design', 'redesign packaging', 'packaging redesign', 'recyclable packaging', 'biodegradable packaging', 'eco-friendly material', 'sustainable material', 'modular design', 'design for disassembly', 'material substitution design', 'reduced material design', 'toxin-free design', 'plant-based packaging'],
        actionVerbs: ['redesigned', 'designed', 'developed eco', 'created sustainable packaging', 'introduced recyclable'],
        excludePatterns: ['plan to design', 'will redesign']
      },
      {
        id: '3_gscm',
        code: '3 GSCM',
        stage: 3,
        definition: 'Integrasi aspek lingkungan ke manajemen rantai pasok (hulu-hilir) termasuk kolaborasi pemasok & circular/reverse flow',
        keywords: ['green supply chain', 'gscm', 'supplier audit', 'environmental standard supplier', 'green procurement', 'sustainable sourcing', 'fsc', 'rspo', 'low-carbon material', 'supplier collaboration', 'supply chain sustainability', 'responsible sourcing', 'certified supplier', 'environmental criteria supplier', 'supplier environmental', 'circular economy supply', 'palm oil certified', 'rainforest alliance supply'],
        actionVerbs: ['audited suppliers', 'required suppliers', 'certified', 'procured', 'collaborated with suppliers', 'sourced sustainably'],
        excludePatterns: ['promoting supplier', 'encouraging supplier', 'seminar for supplier', 'awareness campaign']
      },
      {
        id: '3_ems',
        code: '3 EMS/department',
        stage: 3,
        definition: 'Sistem yang mengatur bagaimana perusahaan merencanakan, melaksanakan, mengawasi dan melaporkan kinerja lingkungan dalam bentuk formal, terstandar, terdokumentasi',
        keywords: ['iso 14001', 'iso 14004', 'ems', 'environmental management system', 'sbti', 'tcfd', 'environmental sop', 'environmental audit', 'ems audit', 'environmental department', 'environmental committee', 'climate risk', 'scenario analysis climate', 'tcfd disclosure', 'net zero target', 'carbon neutral target', 'science-based target', 'environmental policy implementation'],
        actionVerbs: ['certified', 'implemented ems', 'established department', 'conducted audit', 'obtained iso 14001', 'analyzed scenario'],
        excludePatterns: []
      },
      {
        id: '3_gpmr',
        code: '3 Green Performance Measurement and Reporting',
        stage: 3,
        definition: 'Pengukuran kinerja manufaktur hijau dan penyusunan laporan kegiatan hijau',
        keywords: ['iso/ts 14067', 'iso 14067', 'carbon footprint product', 'cfp', 'iso 14046', 'water footprint', 'ghg scope', 'scope 1', 'scope 2', 'scope 3', 'energy intensity', 'water intensity', 'waste intensity', 'gri', 'sustainability report', 'environmental dashboard', 'ecological footprint', 'material footprint', 'pollution footprint', 'lc-water', 'lc waste', 'emission factor', 'iea co2', 'verified emission', 'third party assurance', 'external assurance', 'environmental kpi', 'carbon accounting'],
        actionVerbs: ['measured', 'reported', 'disclosed', 'calculated', 'published', 'verified', 'monitored'],
        excludePatterns: ['methodology only', 'explaining methodology']
      },
      {
        id: '3_eco_labeling',
        code: '3 Eco-Labeling',
        stage: 3,
        definition: 'Pemberian label pada produk atau material yang menunjukkan bahwa produk atau material sudah memenuhi suatu standar lingkungan',
        keywords: ['eco label', 'ecolabel', 'eu ecolabel', 'energy star', 'nordic swan', 'fsc certified', 'rspo certified', 'fairtrade', 'rjc', 'rainforest alliance certified', 'cfp label', 'iso/ts 14067 label', 'carbon label', 'green label', 'environmental certification product', 'epd', 'environmental product declaration'],
        actionVerbs: ['certified', 'obtained certification', 'labeled', 'received eco label', 'achieved fsc'],
        excludePatterns: ['plan to certify', 'pursuing certification']
      },
      {
        id: '3_green_skilling',
        code: '3 Green Skilling',
        stage: 3,
        definition: 'Pelatihan lingkungan bagi karyawan dan pimpinan untuk mendukung teknologi hijau',
        keywords: ['environmental training', 'green training', 'ems training', 'lca training', 'dfe training', 'ghg accounting training', 'green reporting training', 'hazard reduction training', 'employee training environment', 'sustainability training', 'environmental education employee', 'green skills', 'capacity building environment'],
        actionVerbs: ['trained', 'conducted training', 'educated employees', 'provided training', 'organized workshop'],
        excludePatterns: ['plan to train', 'will provide training']
      }
    ]
  },
  stage4: {
    label: 'Stage 4',
    color: '#2e4057',
    bg: '#e8eef5',
    codes: [
      {
        id: '4_open_door',
        code: '4 Open-door Policy',
        stage: 4,
        definition: 'Keterbukaan terhadap pemangku kepentingan eksternal tentang green manufacturing',
        keywords: ['factory tour', 'plant tour', 'open factory', 'green technology sharing', 'third party verification green', 'external verification green operation', 'sharing green technology', 'green operations visit', 'stakeholder plant visit'],
        actionVerbs: ['invited', 'hosted factory tour', 'shared technology', 'opened factory', 'conducted plant tour'],
        excludePatterns: ['plan to open', 'will invite']
      },
      {
        id: '4_media_disclosure',
        code: '4 Media Disclosure Practices',
        stage: 4,
        definition: 'Komunikasi lingkungan (pencapaian, kapabilitas, atau inovasi lingkungan) kepada pihak eksternal melalui saluran media',
        keywords: ['press release green', 'media release environment', 'green award', 'environmental award', 'green certification announcement', 'published green', 'communicated green achievement', 'green campaign external', 'advertising green', 'green brand', 'sustainability communication external', 'external green communication'],
        actionVerbs: ['published', 'announced', 'communicated externally', 'received award', 'promoted green'],
        excludePatterns: []
      }
    ]
  }
};

export const ADDITIONAL_CODES = [
  {
    id: 'renewable_energy',
    code: 'Renewable Energy',
    stage: null,
    definition: 'Penggunaan sumber energi terbarukan dalam operasional',
    keywords: ['solar', 'solar panel', 'solar roof', 'wind energy', 'wind turbine', 'renewable energy', 're100', 'green electricity', 'biomass energy', 'hydropower', 'geothermal', 'ppa', 'renewable power purchase', 'mwh renewable', 'green tariff', 'renewable certificate', 'rec', 'go', 'I-REC'],
    actionVerbs: ['installed solar', 'generated renewable', 'procured renewable', 'switched to renewable'],
    excludePatterns: ['will install solar', 'plan to install', 'considering solar', 'exploring ppa']
  },
  {
    id: 'low_impact_process',
    code: 'Low Impact Process',
    stage: null,
    definition: 'Proses produksi yang memiliki dampak lingkungan lebih rendah',
    keywords: ['low impact', 'clean production', 'cleaner production', 'green chemistry', 'solvent-free', 'water-based', 'bio-based process', 'natural process', 'organic process'],
    actionVerbs: ['adopted', 'implemented low impact', 'switched to cleaner'],
    excludePatterns: ['plan to adopt', 'will implement']
  }
];

export const ALL_CODES = [
  ...Object.values(CODEBOOK).flatMap(s => s.codes),
  ...ADDITIONAL_CODES
];

export const INDUSTRIES = [
  'Automobile Components',
  'Automobile',
  'Beverages',
  'Food Products',
  'Household Durables',
  'Household Products',
  'Leisure Products',
  'Personal Care Products',
  'Textile, Apparel & Luxury Goods',
  'Tobacco'
];

export const REGIONS = ['Asia Timur', 'Asia Tenggara', 'Eropa'];

export const STAGE_COLORS = {
  1: { text: '#9b1d20', bg: '#fde8e8', border: '#f5c6c6' },
  2: { text: '#c77b2a', bg: '#fef3e2', border: '#f5d99a' },
  3: { text: '#2d6a4f', bg: '#d8f3dc', border: '#95d5b2' },
  4: { text: '#2e4057', bg: '#e8eef5', border: '#a8c4d8' },
  null: { text: '#6b3fa0', bg: '#f0e6ff', border: '#d4b5f5' }
};
