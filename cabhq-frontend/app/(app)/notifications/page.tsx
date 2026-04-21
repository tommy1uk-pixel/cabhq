'use client';

import { useMemo, useState } from 'react';
import AdminShell from '@/components/AdminShell';

type NotificationChannel = 'SMS' | 'EMAIL' | 'PUSH' | 'WHATSAPP';
type NotificationAudience = 'CUSTOMER' | 'DRIVER' | 'ACCOUNT' | 'INTERNAL';
type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';

type NotificationItem = {
  id: string;
  title: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
  status: NotificationStatus;
  recipient: string;
  relatedRef?: string | null;
  createdAt: string;
  body: string;
};

type NotificationFormState = {
  title: string;
  audience: NotificationAudience;
  channel: NotificationChannel;
  recipient: string;
  relatedRef: string;
  body: string;
};

const initialNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Driver assigned',
    audience: 'CUSTOMER',
    channel: 'SMS',
    status: 'DELIVERED',
    recipient: 'John Smith',
    relatedRef: 'CAB-250421-1001',
    createdAt: '2026-04-21T08:18:00',
    body: 'Your driver has been assigned and is on the way.',
  },
  {
    id: '2',
    title: 'New job offer',
    audience: 'DRIVER',
    channel: 'PUSH',
    status: 'DELIVERED',
    recipient: 'Imran Patel',
    relatedRef: 'CAB-250421-1002',
    createdAt: '2026-04-21T09:57:00',
    body: 'You have a new job offer waiting for response.',
  },
  {
    id: '3',
    title: 'Invoice sent',
    audience: 'ACCOUNT',
    channel: 'EMAIL',
    status: 'SENT',
    recipient: 'Northside Medical Centre',
    relatedRef: 'INV-2025-001',
    createdAt: '2026-04-21T10:20:00',
    body: 'Your latest invoice is ready for review.',
  },
  {
    id: '4',
    title: 'Dispatch alert',
    audience: 'INTERNAL',
    channel: 'EMAIL',
    status: 'FAILED',
    recipient: 'Ops Team',
    relatedRef: 'CAB-250421-1004',
    createdAt: '2026-04-21T11:05:00',
    body: 'Driver has not updated location for 15 minutes.',
  },
];

const initialForm: NotificationFormState = {
  title: '',
  audience: 'CUSTOMER',
  channel: 'SMS',
  recipient: '',
  relatedRef: '',
  body: '',
};

function formatDateTime(value: string) {
  const d = new Date(value);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClasses(status: NotificationStatus) {
  if (status === 'DELIVERED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (status === 'SENT') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (status === 'QUEUED') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function channelClasses(channel: NotificationChannel) {
  const map: Record<NotificationChannel, string> = {
    SMS: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
    EMAIL: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300',
    PUSH: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    WHATSAPP: 'border-green-500/30 bg-green-500/10 text-green-300',
  };

  return map[channel];
}

function audienceClasses(audience: NotificationAudience) {
  const map: Record<NotificationAudience, string> = {
    CUSTOMER: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
    DRIVER: 'border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
    ACCOUNT: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
    INTERNAL: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
  };

  return map[audience];
}

export default function NotificationsPage() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(initialNotifications);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialNotifications[0]?.id ?? null,
  );
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<NotificationFormState>(initialForm);

  const filteredNotifications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notifications;

    return notifications.filter((item) =>
      [
        item.title,
        item.audience,
        item.channel,
        item.status,
        item.recipient,
        item.relatedRef ?? '',
        item.body,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [notifications, search]);

  const selectedNotification = useMemo(
    () => notifications.find((item) => item.id === selectedId) ?? null,
    [notifications, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      delivered: notifications.filter((n) => n.status === 'DELIVERED').length,
      sent: notifications.filter((n) => n.status === 'SENT').length,
      failed: notifications.filter((n) => n.status === 'FAILED').length,
      queued: notifications.filter((n) => n.status === 'QUEUED').length,
    };
  }, [notifications]);

  function setField<K extends keyof NotificationFormState>(
    key: K,
    value: NotificationFormState[K],
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function sendNotification(e: React.FormEvent) {
    e.preventDefault();

    const payload: NotificationItem = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      audience: form.audience,
      channel: form.channel,
      status: 'QUEUED',
      recipient: form.recipient.trim(),
      relatedRef: form.relatedRef.trim() || null,
      createdAt: new Date().toISOString(),
      body: form.body.trim(),
    };

    if (!payload.title || !payload.recipient || !payload.body) return;

    setNotifications((prev) => [payload, ...prev]);
    setSelectedId(payload.id);
    resetForm();
  }

  function updateStatus(id: string, status: NotificationStatus) {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  }

  function deleteNotification(id: string) {
    const confirmed = window.confirm('Delete this notification?');
    if (!confirmed) return;

    setNotifications((prev) => prev.filter((item) => item.id !== id));

    if (selectedId === id) {
      const remaining = notifications.filter((item) => item.id !== id);
      setSelectedId(remaining[0]?.id ?? null);
    }
  }

  return (
    <AdminShell
      title="Notifications"
      subtitle="Customer, driver, account and internal messaging across SMS, email, push and WhatsApp."
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Delivered" value={stats.delivered} />
          <StatCard label="Sent" value={stats.sent} />
          <StatCard label="Queued" value={stats.queued} />
          <StatCard label="Failed" value={stats.failed} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[430px_1fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5">
              <h2 className="text-2xl font-bold">Send Notification</h2>
              <p className="mt-1 text-sm text-white/60">
                Create outbound updates for customers, drivers and internal teams.
              </p>
            </div>

            <form onSubmit={sendNotification} className="space-y-5">
              <Field
                label="Title"
                input={
                  <input
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="Driver assigned"
                    className={inputClassName}
                  />
                }
              />

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Audience"
                  input={
                    <select
                      value={form.audience}
                      onChange={(e) =>
                        setField('audience', e.target.value as NotificationAudience)
                      }
                      className={inputClassName}
                    >
                      <option value="CUSTOMER">CUSTOMER</option>
                      <option value="DRIVER">DRIVER</option>
                      <option value="ACCOUNT">ACCOUNT</option>
                      <option value="INTERNAL">INTERNAL</option>
                    </select>
                  }
                />

                <Field
                  label="Channel"
                  input={
                    <select
                      value={form.channel}
                      onChange={(e) =>
                        setField('channel', e.target.value as NotificationChannel)
                      }
                      className={inputClassName}
                    >
                      <option value="SMS">SMS</option>
                      <option value="EMAIL">EMAIL</option>
                      <option value="PUSH">PUSH</option>
                      <option value="WHATSAPP">WHATSAPP</option>
                    </select>
                  }
                />
              </div>

              <Field
                label="Recipient"
                input={
                  <input
                    value={form.recipient}
                    onChange={(e) => setField('recipient', e.target.value)}
                    placeholder="John Smith / Ops Team / Company Name"
                    className={inputClassName}
                  />
                }
              />

              <Field
                label="Related Ref"
                input={
                  <input
                    value={form.relatedRef}
                    onChange={(e) => setField('relatedRef', e.target.value)}
                    placeholder="CAB-250421-1001 / INV-2025-001"
                    className={inputClassName}
                  />
                }
              />

              <Field
                label="Message"
                input={
                  <textarea
                    rows={5}
                    value={form.body}
                    onChange={(e) => setField('body', e.target.value)}
                    placeholder="Your driver has been assigned and is on the way."
                    className={`${inputClassName} resize-none`}
                  />
                }
              />

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold text-white transition hover:bg-cyan-500"
              >
                Queue Notification
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Notification Log</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review outbound messages, delivery results and failures.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications..."
                className="w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50 lg:w-[300px]"
              />
            </div>

            {filteredNotifications.length === 0 ? (
              <div className="rounded-2xl bg-[#0b1728] p-6 text-white/60">
                No notifications found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((item) => {
                  const isSelected = selectedId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-5 transition ${
                        isSelected
                          ? 'border-cyan-500/50 bg-[#0c1b2c]'
                          : 'border-white/10 bg-[#0b1728]'
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div
                          className="min-w-0 cursor-pointer"
                          onClick={() =>
                            setSelectedId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-bold">{item.title}</h3>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${audienceClasses(
                                item.audience,
                              )}`}
                            >
                              {item.audience}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${channelClasses(
                                item.channel,
                              )}`}
                            >
                              {item.channel}
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClasses(
                                item.status,
                              )}`}
                            >
                              {item.status}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-white/70">
                            {item.recipient}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/50">
                            <span>Created: {formatDateTime(item.createdAt)}</span>
                            <span>Ref: {item.relatedRef || '—'}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, 'SENT')}
                            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/10"
                          >
                            Mark Sent
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, 'DELIVERED')}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                          >
                            Delivered
                          </button>

                          <button
                            type="button"
                            onClick={() => updateStatus(item.id, 'FAILED')}
                            className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
                          >
                            Failed
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteNotification(item.id)}
                            className="rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="mt-5 grid gap-4 border-t border-white/10 pt-5 xl:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Details
                            </h4>
                            <DetailRow label="Audience" value={item.audience} />
                            <DetailRow label="Channel" value={item.channel} />
                            <DetailRow label="Status" value={item.status} />
                            <DetailRow label="Recipient" value={item.recipient} />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Reference
                            </h4>
                            <DetailRow
                              label="Related Ref"
                              value={item.relatedRef || '—'}
                            />
                            <DetailRow
                              label="Created"
                              value={formatDateTime(item.createdAt)}
                            />
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
                              Body
                            </h4>
                            <p className="text-sm text-white/75">{item.body}</p>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function Field({
  label,
  input,
}: {
  label: string;
  input: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/75">{label}</span>
      {input}
    </label>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}

const inputClassName =
  'w-full rounded-xl border border-white/10 bg-[#0b1728] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-500/50';