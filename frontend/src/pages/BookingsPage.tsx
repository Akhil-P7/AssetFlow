import { useEffect, useState } from 'react';
import { Plus, Calendar as CalIcon, Clock, X } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Select, Input } from '@/components/ui/Input';
import { BookingStatusBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader, EmptyState } from '@/components/ui/LoadingSpinner';
import apiClient from '@/api/apiClient';
import type { Booking, Asset } from '@/types';
import { BookingStatus } from '@/types';

const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 08:00 to 17:00

export function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [resources, setResources] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResource, setSelectedResource] = useState('');
  const [bookModalOpen, setBookModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [bookingData, resourceData] = await Promise.all([
        (await apiClient.get('/bookings')) as Booking[],
        (await apiClient.get('/assets?isBookable=true')) as Asset[],
      ]);
      setBookings(bookingData);
      setResources(resourceData);
      if (resourceData.length > 0) setSelectedResource(resourceData[0].id);
      setLoading(false);
    })();
  }, []);

  if (loading) return <PageLoader />;

  const resourceBookings = bookings.filter(b =>
    b.resourceAssetId === selectedResource &&
    (b.status === BookingStatus.UPCOMING || b.status === BookingStatus.ONGOING)
  );

  const selectedRes = resources.find(r => r.id === selectedResource);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resource Booking"
        subtitle="Book shared resources like conference rooms and vehicles."
        actions={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setBookModalOpen(true)}>
            Book a Slot
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
        <div className="flex-1">
          <Select
            label="Select Resource"
            options={resources.map(r => ({ value: r.id, label: `${r.assetTag} — ${r.name}` }))}
            value={selectedResource}
            onChange={(e) => setSelectedResource(e.target.value)}
          />
        </div>
        {selectedRes && (
          <div className="flex items-end gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>📍 {selectedRes.location}</span>
            <span>📁 {selectedRes.category?.name}</span>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 animate-fade-in shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <CalIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Today's Schedule</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 ml-auto">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
        </div>

        <div className="space-y-0">
          {HOURS.map((hour) => {
            const booking = resourceBookings.find(b => {
              const startHour = new Date(b.startTime).getUTCHours();
              const endHour = new Date(b.endTime).getUTCHours();
              return hour >= startHour && hour < endHour;
            });

            const isStart = booking && new Date(booking.startTime).getUTCHours() === hour;

            return (
              <div key={hour} className="flex group">
                <div className="w-16 shrink-0 text-xs text-slate-500 py-3 text-right pr-4 font-mono">
                  {String(hour).padStart(2, '0')}:00
                </div>

                <div className={`
                  flex-1 border-t border-slate-200 dark:border-slate-800/50 py-3 px-4 min-h-[48px]
                  transition-colors
                  ${booking ? '' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer'}
                `}>
                  {isStart && booking && (
                    <div className={`
                      p-3 rounded-md border-l-4
                      ${booking.status === BookingStatus.ONGOING
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500'
                        : 'bg-blue-50 dark:bg-blue-500/10 border-blue-500'
                      }
                      animate-fade-in
                    `}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {booking.bookedByEmployee?.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(booking.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                            {' — '}
                            {new Date(booking.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                          </p>
                        </div>
                        <BookingStatusBadge status={booking.status} />
                      </div>
                    </div>
                  )}
                  {!booking && (
                    <div className="text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to book this slot
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-6 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-sm bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/30" />
            Ongoing
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-sm bg-blue-100 border border-blue-300 dark:bg-blue-500/20 dark:border-blue-500/30" />
            Upcoming
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 dark:bg-slate-800 dark:border-slate-700" />
            Available
          </div>
        </div>
      </div>

      <Modal open={bookModalOpen} onClose={() => setBookModalOpen(false)} title="Book a Resource"
        footer={<><Button variant="secondary" onClick={() => setBookModalOpen(false)}>Cancel</Button><Button icon={<CalIcon className="w-4 h-4" />}>Book Slot</Button></>}
      >
        <div className="space-y-4">
          <Select label="Resource" placeholder="Select resource" options={resources.map(r => ({ value: r.id, label: `${r.assetTag} — ${r.name}` }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Time" type="datetime-local" />
            <Input label="End Time" type="datetime-local" />
          </div>
          <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-xs text-blue-700 dark:text-blue-400">
            ℹ️ Overlapping bookings will be automatically rejected. A booking ending at 10:00 and another starting at 10:00 do not overlap.
          </div>
        </div>
      </Modal>
    </div>
  );
}
