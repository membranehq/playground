'use client';

import { DataInput, FieldList, FieldMappingDirection, useFieldMappingInstance } from '@membranehq/react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ConfigureFieldMappingModal({
  fieldMappingId,
  connectionId,
  children,
}: {
  fieldMappingId: string;
  connectionId: string;
  children: React.ReactNode;
}) {
  const { fieldMappingInstance, loading, error, patch } = useFieldMappingInstance({
    fieldMappingId,
    connectionId,
  });
  const { dataSourceSchema, exportValue, appSchema, frozenExportFields, importValue, frozenImportFields } =
    fieldMappingInstance || {};

  const isImport =
    fieldMappingInstance?.direction === FieldMappingDirection.IMPORT ||
    fieldMappingInstance?.direction === FieldMappingDirection.BOTH;

  const isExport =
    fieldMappingInstance?.direction === FieldMappingDirection.EXPORT ||
    fieldMappingInstance?.direction === FieldMappingDirection.BOTH;

  const isBidirectional = isImport && isExport;

  return (
    <Dialog modal>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Configure Field Mapping instance</DialogTitle>
        </DialogHeader>

        <div className="flex gap-6 flex-col">
          {!loading && !error && fieldMappingInstance && (
            <Tabs defaultValue={isImport ? 'import' : 'export'} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-5">
                <TabsTrigger value="export" disabled={!isBidirectional && isImport}>
                  Export
                </TabsTrigger>
                <TabsTrigger value="import" disabled={!isBidirectional && isExport}>
                  Import
                </TabsTrigger>
              </TabsList>

              <TabsContent value="export">
                <DataInput
                  value={exportValue}
                  schema={dataSourceSchema}
                  variablesSchema={appSchema}
                  frozenFieldsLocators={frozenExportFields}
                  onChange={(exportValue) => patch({ exportValue })}
                  hideReadOnlyFields
                />
              </TabsContent>
              <TabsContent value="import">
                <FieldList
                  value={importValue}
                  schema={appSchema}
                  variablesSchema={dataSourceSchema}
                  frozenFieldsLocators={frozenImportFields}
                  onChange={(importValue) => patch?.({ importValue })}
                />
              </TabsContent>
            </Tabs>
          )}

          {loading && <Skeleton className="w-full h-10" />}

          {error && (
            <Alert className="mt-2">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
