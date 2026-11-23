'use client';

import { useMemo } from 'react';
import { ExportButton, PageHeader, StatusBadge, Tabs } from '@/components/common';
import { DataTable, type Column } from '@/components/DataTable';
import { FilterBar } from '@/components/FilterBar';
import { DEFAULT_PAGE_SIZE } from '@/config';
import { useAuditLogs } from '@/hooks/useDashboard';
import { useUrlState } from '@/hooks/useUrlState';
import { exportTable, type ExportFormat } from '@/lib/exporters';
import { formatDateTime, periodLabel } from '@/lib/utils';
import { fetchAllPages } from '@/services/core/backend';
import { ROLE_LABEL } from '@/services/adminMembers';
import { AUDIT_AREAS, dashboardService, type AuditLogQuery, type BackendActivity } from '@/services/dashboard';

type Tab = AuditLogQuery['type'];
const TABS: { value: Tab; label: string }[] = [
  { value: 'changes', label: 'Activity' },
  { value: 'logins', label: 'Login History' },
];
const areaLabel = (table: string) => {
  const areas: Record<string, string> = {
    events: 'Events', future_event_plans: 'Event Plans', notices: 'Notices', users: 'Members', executive_applications: 'Executive Requests',
    donations: 'Donations', society_transactions: 'Expenses', generated_reports: 'Reports', media_items: 'Media', app_settings: 'Settings',
  };
  return areas[table] ?? table;
};
const who = (a: BackendActivity) => a.actor_name ?? 'System';
const roleOf = (a: BackendActivity) => (a.actor_role ? ROLE_LABEL[a.actor_role] : '');

/** The URL (tab, page, search, area, dates) → the GET /admin/activities query */
function useAuditQuery(): AuditLogQuery {
  const url = useUrlState();
  const type: Tab = url.get('tab') === 'logins' ? 'logins' : 'changes';
  return {
    page: url.page,
    limit: DEFAULT_PAGE_SIZE,
    type,
    area: type === 'changes' ? url.get('area') || undefined : undefined,
    search: url.search || undefined,
    from_date: url.range.from,
    to_date: url.range.to,
  };
}

/**
 * Audit trail: who created, changed, approved or deleted what (Activity), and every login to the app or the panel
 * with the device and IP address (Login History). Read from audit_logs; nothing can be edited here.
 */
export default function AuditLogsPage() {
  const url = useUrlState();
  const query = useAuditQuery();
  const list = useAuditLogs(query);
  const logins = query.type === 'logins';

  const columns = useMemo<Column<BackendActivity>[]>(
    () =>
      logins
        ? [
            { key: 'when', header: 'Date & Time', className: 'whitespace-nowrap px-4 py-3', render: (a) => formatDateTime(a.created_at) },
            { key: 'who', header: 'User', render: (a) => <span className="font-medium">{who(a)}</span> },
            { key: 'role', header: 'Role', render: (a) => (a.actor_role ? <StatusBadge status={roleOf(a)} /> : '—') },
            { key: 'device', header: 'Device', render: (a) => a.device ?? '—' },
            { key: 'ip', header: 'IP Address', render: (a) => a.ip_address ?? '—' },
          ]
        : [
            { key: 'when', header: 'Date & Time', className: 'whitespace-nowrap px-4 py-3', render: (a) => formatDateTime(a.created_at) },
            { key: 'action', header: 'Action', render: (a) => <span className="font-medium">{a.text}</span> },
            { key: 'target', header: 'Record', render: (a) => a.target ?? '—' },
            { key: 'area', header: 'Area', render: (a) => areaLabel(a.table_name) },
            {
              key: 'who',
              header: 'Done by',
              render: (a) => (
                <span>
                  {who(a)}
                  {a.actor_role ? <span className="block text-xs text-muted-foreground">{roleOf(a)}</span> : null}
                </span>
              ),
            },
            { key: 'ip', header: 'IP Address', render: (a) => a.ip_address ?? '—' },
          ],
    [logins],
  );

  /** Every row matching the filters, read page by page, as Excel or PDF */
  const onExport = async (format: ExportFormat) => {
    const { page, limit, ...filters } = query;
    const rows = await fetchAllPages(async (p, l) => {
      const { activities, pagination } = await dashboardService.auditLogs({ ...filters, page: p, limit: l });
      return { rows: activities, pagination };
    });
    const subtitle = [
      query.search && `User "${query.search}"`,
      query.area && AUDIT_AREAS.find((a) => a.value === query.area)?.label,
      periodLabel(query.from_date, query.to_date),
    ]
      .filter(Boolean)
      .join(' · ');
    await exportTable(
      logins
        ? {
            title: 'Login History',
            subtitle,
            columns: ['Date & Time', 'User', 'Role', 'Device', 'IP Address'],
            rows: rows.map((a) => [formatDateTime(a.created_at), who(a), roleOf(a), a.device ?? '', a.ip_address ?? '']),
          }
        : {
            title: 'Audit Log',
            subtitle,
            columns: ['Date & Time', 'Action', 'Record', 'Area', 'Done by', 'Role', 'IP Address'],
            rows: rows.map((a) => [formatDateTime(a.created_at), a.text, a.target ?? '', areaLabel(a.table_name), who(a), roleOf(a), a.ip_address ?? '']),
          },
      logins ? 'login-history' : 'audit-log',
      format,
    );
  };

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Who created, changed or approved what, and every login to the app and the panel"
        actions={<ExportButton onExport={onExport} disabled={!list.data?.pagination.total} />}
      />
      <Tabs tabs={TABS} value={query.type} onChange={(tab) => url.setParams({ tab: tab === 'changes' ? undefined : tab, area: undefined, page: undefined })} />
      <FilterBar
        searchPlaceholder="Search by user name or email..."
        dateRange
        selects={logins ? [] : [{ name: 'area', label: 'All areas', options: AUDIT_AREAS }]}
      />
      <DataTable
        columns={columns}
        rows={list.data?.activities}
        total={list.data?.pagination.total ?? 0}
        page={url.page}
        pageSize={DEFAULT_PAGE_SIZE}
        isLoading={list.isLoading}
        isFetching={list.isFetching}
        isError={list.isError}
        errorMessage={list.error?.message}
        onRetry={() => list.refetch()}
        onPageChange={(page) => url.setParams({ page })}
        itemLabel={logins ? 'logins' : 'activities'}
        emptyMessage={logins ? 'No logins found.' : 'No activity found.'}
      />
    </>
  );
}
