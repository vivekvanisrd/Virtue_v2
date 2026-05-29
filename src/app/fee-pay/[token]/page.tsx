import ParentPayClient from "./ParentPayClient";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function ParentPayPage({ params }: { params: Params }) {
  const { token } = await params;
  return <ParentPayClient token={token} />;
}
