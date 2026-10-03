import React, { useEffect, useState } from 'react';
import { get, put } from '../../api.js';
import { useI18n } from '../../i18n.jsx';
import { useToast } from '../../components/ui.jsx';

const TABS = ['general', 'ai', 'payments', 'signup'];

export default function AdminSettings() {
  const { t } = useI18n();
  const toast = useToast();
  const [tab, setTab] = useState('general');
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    get('/admin/settings').then((d) => setS(d.settings)).catch((e) => toast(e.message, 'error'));
  }, []);

  if (!s) return <div className="page"><div className="empty-state">{t('common_loading')}</div></div>;

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? (e.target.checked ? '1' : '0') : e.target.value;
    setS((prev) => ({ ...prev, [k]: v }));
  };

  async function save() {
    setBusy(true);
    try {
      await put('/admin/settings', s);
      toast(t('settings_saved'), 'success');
    } catch (e) { toast(e.message, 'error'); }
    setBusy(false);
  }

  const F = ({ k, label, type = 'text', placeholder, hint }) => (
    <div className="field">
      <label>{label}</label>
      <input className="input" type={type} value={s[k] || ''} onChange={set(k)} placeholder={placeholder || ''} />
      {hint && <div className="muted mt-8" style={{ fontSize: 12.5 }}>{hint}</div>}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('admin_settings')}</h1>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : t('common_save')}</button>
      </div>

      <div className="settings-tabs">
        {TABS.map((tb) => (
          <button key={tb} className={`settings-tab ${tab === tb ? 'active' : ''}`} onClick={() => setTab(tb)}>
            {t(`settings_${tb === 'ai' ? 'ai' : tb === 'signup' ? 'signup' : tb}`)}
          </button>
        ))}
      </div>

      <div className="card">
        {tab === 'general' && (
          <div className="grid grid-2" style={{ gap: 14 }}>
            <F k="site_name" label="Site name" />
            <F k="site_tagline" label="Tagline" />
            <F k="site_url" label="Site URL" placeholder="https://yourdomain.com" hint="Used for payment return URLs and referral links. Must include http(s):// and no trailing slash." />
            <F k="footer_text" label="Footer text" />
            <F k="currency" label="Currency code" placeholder="USD" />
            <F k="currency_symbol" label="Currency symbol" placeholder="$" />
            <div className="field">
              <label>Chat message cost (credits)</label>
              <input className="input" type="number" min="1" value={s.chat_cost_credits || '1'} onChange={set('chat_cost_credits')} />
            </div>
          </div>
        )}

        {tab === 'ai' && (
          <>
            <div className="alert alert-info mb-16">
              Works with OpenAI and any OpenAI-compatible API: DeepSeek (https://api.deepseek.com/v1), Groq (https://api.groq.com/openai/v1), Anthropic via proxy, OpenRouter (https://openrouter.ai/api/v1), or self-hosted (Ollama, vLLM, LM Studio).
            </div>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <F k="ai_base_url" label="API base URL" placeholder="https://api.openai.com/v1" />
              <F k="ai_model" label="Model" placeholder="gpt-4o-mini" />
            </div>
            <F k="ai_api_key" label="API key" type="password" placeholder="sk-..." />
            <div className="grid grid-2" style={{ gap: 14 }}>
              <F k="ai_max_tokens" label="Max tokens" type="number" placeholder="2048" />
              <F k="ai_temperature" label="Temperature (0-2)" type="number" placeholder="0.7" />
            </div>
            <div className="field">
              <label>Chat assistant system prompt</label>
              <textarea className="textarea" value={s.chat_system_prompt || ''} onChange={set('chat_system_prompt')} />
            </div>
          </>
        )}

        {tab === 'payments' && (
          <>
            <h3 style={{ fontSize: 15, marginBottom: 12 }}>PayPal</h3>
            <div className="grid grid-2" style={{ gap: 14 }}>
              <div className="field">
                <label>Mode</label>
                <select className="select" value={s.paypal_mode || 'sandbox'} onChange={set('paypal_mode')}>
                  <option value="sandbox">Sandbox (testing)</option>
                  <option value="live">Live</option>
                </select>
              </div>
              <F k="paypal_client_id" label="Client ID" placeholder="AYn..." />
            </div>
            <F k="paypal_secret" label="Secret" type="password" />
            <h3 style={{ fontSize: 15, margin: '24px 0 12px' }}>Stripe</h3>
            <F k="stripe_secret_key" label="Secret key" type="password" placeholder="sk_live_... or sk_test_..." hint="Create at dashboard.stripe.com → Developers → API keys. Use test keys first." />
          </>
        )}

        {tab === 'signup' && (
          <div className="grid grid-2" style={{ gap: 14 }}>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="checkbox-row">
                <input type="checkbox" checked={s.signup_enabled === '1'} onChange={set('signup_enabled')} />
                Registration enabled
              </label>
            </div>
            <F k="signup_bonus_credits" label="Signup bonus credits" type="number" hint="Free credits granted to every new user. Set 0 to disable." />
            <F k="referral_reward_percent" label="Referral reward %" type="number" hint="Percentage of a referred user's payment given to the referrer as credits." />
            <F k="referral_credits_per_unit" label="Credits per currency unit" type="number" hint="E.g. 10 → a $19 purchase with 20% reward = 19 × 10 × 20% = 38 credits." />
          </div>
        )}

        <div className="mt-24">
          <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : t('common_save')}</button>
        </div>
      </div>
    </div>
  );
}
