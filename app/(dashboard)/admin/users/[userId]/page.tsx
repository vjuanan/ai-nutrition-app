import { redirect } from 'next/navigation';

export default function LegacyAdminUserDetailRedirect({
  params,
}: {
  params: { userId: string };
}) {
  redirect(`/administration/users/${params.userId}`);
}

