import { useRouter } from "next/router";

export default function JobDetail() {
  const router = useRouter();
  const { jobId } = router.query;

  return (
    <div>
      <h1>Job Detail: {jobId}</h1>
    </div>
  );
}
