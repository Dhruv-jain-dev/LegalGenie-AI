import { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  FileText,
  Mail,
  Building2,
  Lock,
  Smartphone,
  LogOut,
  Check,
} from 'lucide-react';
import Card from '@/components/Card';
import Button from '@/components/Button';
import Disclaimer from '@/components/Disclaimer';
import UserAvatar from '@/components/UserAvatar';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Tab = 'profile' | 'preferences' | 'security' | 'legal';

const tabs: { id: Tab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'legal', label: 'Legal & Privacy', icon: FileText },
];

export default function SettingsPage() {
  const { user, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    organisation: user?.organisation ?? '',
  });

  const handleSave = async () => {
    await updateProfile(form);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
          Settings
        </h1>
        <p className="mt-1 text-ink-500">Manage your account, preferences, and security.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto lg:flex-col">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'profile' && (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-lg font-bold text-ink-900">Profile</h2>
              <p className="mb-6 text-sm text-ink-500">Update your personal and organisation details.</p>

              <div className="mb-6 flex items-center gap-4">
                <UserAvatar name={form.name} size="lg" />
                <div>
                  <p className="font-display text-base font-bold text-ink-900">{form.name}</p>
                  <p className="text-sm text-ink-500">{form.email}</p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Full Name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Work Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">
                    Organisation
                  </label>
                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="text"
                      value={form.organisation}
                      onChange={(e) => setForm((f) => ({ ...f, organisation: e.target.value }))}
                      className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 transition-colors focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <Button onClick={handleSave} leftIcon={saved ? <Check className="h-4 w-4" /> : undefined}>
                  {saved ? 'Saved!' : 'Save Changes'}
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-lg font-bold text-ink-900">Preferences</h2>
              <p className="mb-6 text-sm text-ink-500">
                Customize your LegalGenie workspace experience.
              </p>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Theme</label>
                  <select className="w-full max-w-xs rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm text-ink-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    <option>Light</option>
                    <option>System</option>
                  </select>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink-800">Email Notifications</p>
                    <p className="text-xs text-ink-500">Receive updates about your documents and conversations.</p>
                  </div>
                  <Toggle defaultChecked />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink-800">Voice Preferences</p>
                    <p className="text-xs text-ink-500">Enable voice input for chat and consultation.</p>
                  </div>
                  <Toggle defaultChecked />
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-lg font-bold text-ink-900">Security</h2>
              <p className="mb-6 text-sm text-ink-500">Manage your password and account security.</p>

              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Current Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      type="password"
                      placeholder="Enter current password"
                      className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </div>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700">New Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="password"
                        placeholder="Enter new password"
                        className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-ink-700">Confirm Password</label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        type="password"
                        placeholder="Re-enter password"
                        className="w-full rounded-xl border border-ink-200 bg-white py-3 pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-300 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-ink-100 bg-ink-50/50 px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <Smartphone className="h-4 w-4 text-ink-400" />
                    <p className="text-sm font-medium text-ink-800">Active Sessions</p>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    You are currently signed in on this device.
                  </p>
                </div>

                <Button variant="danger" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </Card>
          )}

          {activeTab === 'legal' && (
            <Card className="p-6">
              <h2 className="mb-1 font-display text-lg font-bold text-ink-900">Legal & Privacy</h2>
              <p className="mb-6 text-sm text-ink-500">
                Important information about LegalGenie and your privacy.
              </p>

              <div className="space-y-4">
                <div className="rounded-xl border border-warning-200 bg-warning-50 px-5 py-4">
                  <p className="text-sm font-medium text-warning-800">
                    LegalGenie provides general legal information and drafting assistance. It does not
                    provide professional legal advice.
                  </p>
                </div>

                <div className="rounded-xl border border-ink-100 bg-ink-50/50 px-5 py-4">
                  <h3 className="text-sm font-bold text-ink-800">Document Privacy</h3>
                  <p className="mt-1 text-sm text-ink-500">
                    Your uploaded documents stay within your workspace. LegalGenie processes your
                    documents to provide AI-assisted analysis but does not share them with third parties.
                  </p>
                </div>

                <div className="rounded-xl border border-ink-100 bg-ink-50/50 px-5 py-4">
                  <h3 className="text-sm font-bold text-ink-800">Data Retention</h3>
                  <p className="mt-1 text-sm text-ink-500">
                    Your conversations, summaries, and drafts are stored in your workspace and can be
                    deleted at any time.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Disclaimer variant="inline" />
    </div>
  );
}

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked((v) => !v)}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-brand-600' : 'bg-ink-200'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-soft transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
