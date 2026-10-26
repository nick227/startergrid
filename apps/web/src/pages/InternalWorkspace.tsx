import { AdminShell } from '@/components/operator/AdminShell.tsx';
import { DealershipDirectory } from '@/components/dealers/DealershipDirectory.tsx';
import { DealershipRecordView, recordTabFromRoute } from '@/components/dealers/DealershipRecordView.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { adminDealerHash, dealerViewHash } from '@/lib/routes.ts';

/** Internal support staff: the same directory and dealership page as site admins, scoped to assigned dealerships. */
export default function InternalWorkspace({ dealerId, dealerPage }: { dealerId?: string | null; dealerPage?: string | null }) {
  const { user } = useAuth();
  return (
    <AdminShell>
      {dealerId ? (
        <DealershipRecordView
          key={dealerId}
          dealerId={dealerId}
          initialTab={recordTabFromRoute(dealerPage)}
          viewer={{ userId: user?.id, isSiteAdmin: false }}
          onOpenDealerView={(id, page) => { window.location.hash = dealerViewHash(id, page); }}
          onBackToDirectory={() => { window.location.hash = '#/admin/dealers'; }}
        />
      ) : (
        <DealershipDirectory
          currentUserId={user?.id}
          includeChannelIssues={false}
          onOpenDealership={(id) => { window.location.hash = adminDealerHash(id); }}
        />
      )}
    </AdminShell>
  );
}
