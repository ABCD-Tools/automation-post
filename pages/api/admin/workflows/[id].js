export default async function handler(req, res) {
  const { id } = req.query;
  
  // TODO: Implement workflow handler
  res.status(200).json({ message: `Workflow ${id}` });
}
