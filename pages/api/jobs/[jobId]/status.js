export default async function handler(req, res) {
  const { jobId } = req.query;
  
  // TODO: Implement status handler
  res.status(200).json({ message: `Job status for ${jobId}` });
}
