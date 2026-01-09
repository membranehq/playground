'use client';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';
import { useSelectedLayoutSegments } from 'next/navigation';
import { Fragment } from 'react';

const mapping: Record<string, string> = {
  integrations: 'Integrations',
  users: 'Users',
  connections: 'Integrations',
  actions: 'Actions',
  flows: 'Flows',
  'data-sources': 'Data Sources',
  'field-mappings': 'Field Mappings',
  agent: 'Agent',
  'workflow-builder': 'Workflow Builder',
  workflows: 'Workflows',
};

// Custom href overrides for specific segments
const hrefOverrides: Record<string, string> = {
  connections: '/integrations', // Connections breadcrumb links to Integrations page
};

// Segments to hide from breadcrumbs
const hiddenSegments = ['', 'sessions'];

// Build href for a segment based on original segments array
function getHrefForSegment(segments: string[], targetSegment: string): string {
  const targetIndex = segments.indexOf(targetSegment);
  if (targetIndex === -1) return '/';
  return '/' + segments.slice(0, targetIndex + 1).join('/');
}

export const Breadcrumbs = () => {
  const segments = useSelectedLayoutSegments();
  const visibleSegments = segments.filter((s) => !hiddenSegments.includes(s));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleSegments.map((segment, index, source) => (
          <Fragment key={segment}>
            {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}

            {index === source.length - 1 ? (
              <BreadcrumbItem>
                <BreadcrumbPage>{mapping[segment] || segment}</BreadcrumbPage>
              </BreadcrumbItem>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={hrefOverrides[segment] || getHrefForSegment(segments, segment)} className="capitalize">
                  {mapping[segment] || segment}
                </Link>
              </BreadcrumbLink>
            )}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
