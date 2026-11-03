import type { Report } from '@/types';
import { createResource } from './core/resource';

const resource = createResource<Report>('reports', 'report', (r) => r.title);

export const reportsService = {
  ...resource,
  generateReport: (input: { title: string; period: string; format: Report['format'] }) =>
    resource.create({ ...input, generatedOn: new Date().toISOString() }),
};
