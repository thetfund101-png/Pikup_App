import { useState } from 'react';
import { FlatList, Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Banner, Button, Field } from '@/components/ui';
import { toMessage } from '@/lib/errors';
import { signedDocumentUrl, usePendingDocuments, useReviewDocument } from '@/features/admin/hooks';
import type { DriverDocument } from '@/types/domain';

function DocumentCard({ doc, driverName }: { doc: DriverDocument; driverName: string }) {
  const review = useReviewDocument();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    try {
      setError(null);
      await Linking.openURL(await signedDocumentUrl(doc.file_path));
    } catch (e) {
      setError(toMessage(e));
    }
  };

  return (
    <View className="card gap-3">
      <View>
        <Text className="font-heading text-base text-asphalt">{driverName}</Text>
        <Text className="font-body text-sm capitalize text-asphalt-mute">
          {doc.doc_type.replace('_', ' ')} · uploaded {new Date(doc.created_at).toLocaleDateString()}
        </Text>
      </View>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {review.error ? <Banner tone="error">{review.error.message}</Banner> : null}
      {rejecting ? (
        <>
          <Field label="Reason for rejection" value={reason} onChangeText={setReason} placeholder="Photo is blurry, document expired…" />
          <View className="flex-row gap-3">
            <Button className="flex-1" title="Back" variant="ghost" onPress={() => setRejecting(false)} />
            <Button className="flex-1" title="Reject" variant="danger" disabled={reason.trim().length < 3} loading={review.isPending}
              onPress={() => review.mutate({ id: doc.id, status: 'rejected', reason: reason.trim() })} />
          </View>
        </>
      ) : (
        <View className="flex-row gap-3">
          <Button className="flex-1" title="View" variant="ghost" onPress={open} />
          <Button className="flex-1" title="Reject" variant="ghost" onPress={() => setRejecting(true)} />
          <Button className="flex-1" title="Approve" loading={review.isPending} onPress={() => review.mutate({ id: doc.id, status: 'approved' })} />
        </View>
      )}
    </View>
  );
}

export default function Documents() {
  const { data = [], isLoading, error, refetch, isRefetching } = usePendingDocuments();
  return (
    <SafeAreaView className="screen">
      <FlatList
        data={data}
        keyExtractor={(i) => i.doc.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerClassName="mx-auto w-full max-w-2xl gap-3 p-5"
        ListHeaderComponent={
          <View className="mb-2 gap-3">
            <Text className="title">Documents to review</Text>
            {error ? <Banner tone="error">{error.message}</Banner> : null}
          </View>
        }
        ListEmptyComponent={<Text className="subtitle">{isLoading ? 'Loading…' : 'All caught up. New uploads will appear here.'}</Text>}
        renderItem={({ item }) => <DocumentCard doc={item.doc} driverName={item.driverName} />}
      />
    </SafeAreaView>
  );
}
