export default async function handler(req, res) {
  // TODO: Implement heartbeat handler
  res.status(200).json({ message: 'heartbeat endpoint' });
}
