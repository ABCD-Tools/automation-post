export default async function handler(req, res) {
  const { id } = req.query;
  
  // TODO: Implement micro-action handler
  res.status(200).json({ message: `Micro-action ${id}` });
}
