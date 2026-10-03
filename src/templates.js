'use strict';

const TEMPLATES = [
  {
    id: 'blog-article',
    name: 'SEO Blog Article',
    icon: 'article',
    tagline: 'Full SEO-optimized article with headings, intro and conclusion',
    cost: 3,
    stream: true,
    fields: [
      { name: 'keyword', label: 'Target Keyword', type: 'text', required: true, placeholder: 'e.g. best running shoes 2026' },
      { name: 'title', label: 'Article Title (optional)', type: 'text', required: false, placeholder: 'Leave empty to auto-generate' },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Friendly', 'Persuasive', 'Informative', 'Casual'], default: 'Professional' },
      { name: 'length', label: 'Length', type: 'select', options: ['Short (~400 words)', 'Medium (~800 words)', 'Long (~1500 words)'], default: 'Medium (~800 words)' },
      { name: 'language', label: 'Language', type: 'text', required: false, placeholder: 'e.g. English (default)' },
    ],
    prompt: (i) => `You are an expert SEO content writer. Write a complete, publish-ready blog article.
Target keyword: "${i.keyword}"
${i.title ? `Article title: "${i.title}"` : 'Create a compelling, click-worthy title containing the keyword.'}
Tone: ${i.tone || 'Professional'}
Length: ${i.length || 'Medium (~800 words)'}
${i.language ? `Write in this language: ${i.language}` : ''}
Requirements:
- Start with the article title as a Markdown H1 (# Title)
- Engaging introduction that hooks the reader and includes the keyword naturally
- Well-structured body with H2/H3 Markdown subheadings
- Practical, accurate, non-fluffy information
- Use bullet lists where helpful
- Conclusion with a call to action
- Naturally place the keyword in the first paragraph, subheadings and conclusion (no keyword stuffing)
Output clean Markdown only.`,
  },
  {
    id: 'product-description',
    name: 'Product Description',
    icon: 'cart',
    tagline: 'Conversion-focused product copy for eCommerce',
    cost: 1,
    stream: true,
    fields: [
      { name: 'product', label: 'Product Name', type: 'text', required: true, placeholder: 'e.g. Ergonomic Mesh Office Chair' },
      { name: 'features', label: 'Key Features', type: 'textarea', required: true, placeholder: 'List the main features, one per line' },
      { name: 'audience', label: 'Target Audience', type: 'text', required: false, placeholder: 'e.g. remote workers' },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Persuasive', 'Professional', 'Friendly', 'Luxury'], default: 'Persuasive' },
    ],
    prompt: (i) => `You are an eCommerce copywriting expert. Write a product description that converts browsers into buyers.
Product: ${i.product}
Key features:
${i.features}
${i.audience ? `Target audience: ${i.audience}` : ''}
Tone: ${i.tone || 'Persuasive'}
Structure: a short benefit-driven opening paragraph, a "Why you'll love it" bullet list of benefits (derived from features), and a closing call to action. Also include 3 SEO meta description alternatives (max 155 characters each) at the end under a "Meta Descriptions" heading. Output Markdown.`,
  },
  {
    id: 'seo-meta',
    name: 'SEO Meta Tags',
    icon: 'search',
    tagline: 'Meta titles & descriptions that boost click-through rate',
    cost: 1,
    fields: [
      { name: 'keyword', label: 'Target Keyword', type: 'text', required: true },
      { name: 'page', label: 'Page / Content Summary', type: 'textarea', required: true, placeholder: 'What is this page about?' },
    ],
    prompt: (i) => `You are an SEO specialist. For the target keyword "${i.keyword}" and this page: "${i.page}"
Generate exactly 5 options, each containing:
- Meta title (50-60 characters)
- Meta description (140-155 characters)
- URL slug suggestion
Number them 1-5. Keep character counts within the limits. Output as a Markdown list.`,
  },
  {
    id: 'google-ads',
    name: 'Google Ads Copy',
    icon: 'ads',
    tagline: 'Responsive search ads with headlines & descriptions',
    cost: 1,
    fields: [
      { name: 'product', label: 'Product / Service', type: 'text', required: true },
      { name: 'keyword', label: 'Main Keyword', type: 'text', required: true },
      { name: 'usp', label: 'Unique Selling Point', type: 'text', required: false, placeholder: 'e.g. free shipping, 30-day trial' },
    ],
    prompt: (i) => `You are a Google Ads expert. Create a responsive search ad for "${i.product}" targeting the keyword "${i.keyword}".${i.usp ? ` Unique selling point: ${i.usp}.` : ''}
Provide:
- 10 headlines (max 30 characters each)
- 4 descriptions (max 90 characters each)
- 3 sitelink extension suggestions with 2 description lines each
Mark each headline/description with its character count in parentheses. Output Markdown.`,
  },
  {
    id: 'social-post',
    name: 'Social Media Post',
    icon: 'social',
    tagline: 'Engaging posts for any platform',
    cost: 1,
    fields: [
      { name: 'platform', label: 'Platform', type: 'select', options: ['LinkedIn', 'Twitter/X', 'Instagram', 'Facebook', 'TikTok'], default: 'LinkedIn' },
      { name: 'topic', label: 'Topic / Message', type: 'textarea', required: true },
      { name: 'goal', label: 'Goal', type: 'select', options: ['Engagement', 'Traffic', 'Sales', 'Awareness'], default: 'Engagement' },
    ],
    prompt: (i) => `You are a social media manager. Write 3 alternative ${i.platform} posts about: "${i.topic}". Goal: ${i.goal || 'Engagement'}.
Rules: match the native style and length conventions of ${i.platform}. Include relevant hashtags and (where suitable) a call to action. Number the options 1-3. Output Markdown.`,
  },
  {
    id: 'email-marketing',
    name: 'Marketing Email',
    icon: 'mail',
    tagline: 'Email campaigns people actually open',
    cost: 1,
    fields: [
      { name: 'purpose', label: 'Email Purpose', type: 'text', required: true, placeholder: 'e.g. announce new pricing plans' },
      { name: 'audience', label: 'Audience', type: 'text', required: true, placeholder: 'e.g. existing customers' },
      { name: 'cta', label: 'Call To Action', type: 'text', required: true, placeholder: 'e.g. upgrade now' },
    ],
    prompt: (i) => `You are an email marketing expert. Write a marketing email.
Purpose: ${i.purpose}
Audience: ${i.audience}
Call to action: ${i.cta}
Provide: 5 subject line options (max 50 characters, one with an emoji), a preview text for each, and the full email body (greeting, concise persuasive copy, clear CTA button text, sign-off). Output Markdown.`,
  },
  {
    id: 'paraphrase',
    name: 'Paraphrase / Rewrite',
    icon: 'rewrite',
    tagline: 'Rewrite content while keeping the meaning',
    cost: 1,
    stream: true,
    fields: [
      { name: 'text', label: 'Text To Rewrite', type: 'textarea', required: true, large: true },
      { name: 'mode', label: 'Mode', type: 'select', options: ['Standard rewrite', 'Simplify', 'More formal', 'More casual', 'Expand'], default: 'Standard rewrite' },
    ],
    prompt: (i) => `Rewrite the following text. Mode: ${i.mode || 'Standard rewrite'}. Keep the original meaning and all facts intact, change wording and sentence structure, fix any grammar issues. Output ONLY the rewritten text, no commentary.
Text:
"""
${i.text}
"""`,
  },
  {
    id: 'summarize',
    name: 'Summarizer',
    icon: 'summary',
    tagline: 'Condense long text into key points',
    cost: 1,
    fields: [
      { name: 'text', label: 'Text To Summarize', type: 'textarea', required: true, large: true },
      { name: 'format', label: 'Format', type: 'select', options: ['Bullet points', 'Short paragraph', 'Executive summary'], default: 'Bullet points' },
    ],
    prompt: (i) => `Summarize the following text as ${i.format || 'Bullet points'}. Capture all key facts and conclusions, stay neutral, do not add outside information. Output Markdown only.
Text:
"""
${i.text}
"""`,
  },
  {
    id: 'grammar-fix',
    name: 'Grammar & Spell Fix',
    icon: 'grammar',
    tagline: 'Proofread and polish any text',
    cost: 1,
    fields: [
      { name: 'text', label: 'Your Text', type: 'textarea', required: true, large: true },
    ],
    prompt: (i) => `Proofread the following text. Fix grammar, spelling, and punctuation errors and improve clarity, but keep the author's voice and meaning. Output format: first the corrected text, then a short "Changes made" bullet list. 
Text:
"""
${i.text}
"""`,
  },
  {
    id: 'keyword-ideas',
    name: 'Keyword Ideas',
    icon: 'keyword',
    tagline: 'Long-tail keywords & content angles',
    cost: 1,
    fields: [
      { name: 'seed', label: 'Seed Keyword', type: 'text', required: true },
      { name: 'niche', label: 'Niche / Industry', type: 'text', required: false },
    ],
    prompt: (i) => `You are an SEO keyword researcher. For the seed keyword "${i.seed}"${i.niche ? ` in the "${i.niche}" niche` : ''}, generate:
- 15 long-tail keyword variations (informational intent)
- 10 commercial/buying-intent keywords
- 10 question keywords suitable for FAQ/blog content
Present as three Markdown lists with clear headings. Only output keywords a real searcher would plausibly type.`,
  },
  {
    id: 'faq-generator',
    name: 'FAQ Generator',
    icon: 'faq',
    tagline: 'FAQ sections with schema-ready Q&A',
    cost: 1,
    fields: [
      { name: 'topic', label: 'Topic / Page', type: 'text', required: true },
      { name: 'count', label: 'Number of Questions', type: 'select', options: ['5', '8', '10'], default: '8' },
    ],
    prompt: (i) => `Generate ${i.count || '8'} frequently asked questions with concise, accurate answers (2-4 sentences each) about: "${i.topic}". Order them from most to least commonly asked. Format as Markdown H3 questions with answer paragraphs, suitable for an FAQ page and FAQPage schema.`,
  },
  {
    id: 'landing-page',
    name: 'Landing Page Copy',
    icon: 'landing',
    tagline: 'Hero, benefits, social proof & CTA sections',
    cost: 2,
    stream: true,
    fields: [
      { name: 'product', label: 'Product / Service', type: 'text', required: true },
      { name: 'audience', label: 'Target Audience', type: 'text', required: true },
      { name: 'problem', label: 'Main Problem It Solves', type: 'textarea', required: true },
    ],
    prompt: (i) => `You are a conversion-rate optimization copywriter. Write complete landing page copy for "${i.product}", targeting ${i.audience}, solving this problem: "${i.problem}".
Include these labeled sections in Markdown:
## Hero (headline max 60 chars, subheadline, primary CTA button text)
## Problem Agitation
## Solution & Key Benefits (4-6 benefit blocks with short headlines)
## How It Works (3 steps)
## Social Proof (3 realistic testimonial templates with placeholders)
## FAQ (5 Q&A)
## Final CTA`,
  },
];

function getTemplate(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}

function publicTemplates() {
  return TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    icon: t.icon,
    tagline: t.tagline,
    cost: t.cost,
    stream: !!t.stream,
    fields: t.fields,
  }));
}

module.exports = { TEMPLATES, getTemplate, publicTemplates };
